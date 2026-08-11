# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from datetime import datetime, timezone

from genlayer import *

ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"

VALID_SIDES = ("for", "against")


@allow_storage
@dataclass
class Bet:
    bet_id: u256
    event_id: u256
    user_address: Address
    side: str  # "for" | "against"
    amount: u256  # atto-GEN


@allow_storage
@dataclass
class BettingEvent:
    event_id: u256
    creator_address: Address
    title: str
    description: str
    category: str
    end_date: str
    status: str  # "open" | "resolved"
    result: str  # "" | "for" | "against"
    resolution: str
    total_for: u256
    total_against: u256
    paid_out: bool
    source_url: str  # "" if none provided; used to ground resolution in fetched evidence


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    leader_msg = getattr(leaders_res, "message", "") or ""
    try:
        leader_fn()
        return False
    except gl.vm.UserError as e:
        validator_msg = getattr(e, "message", str(e))
        if validator_msg.startswith(ERROR_EXPECTED):
            return validator_msg == leader_msg
        return False
    except Exception:
        return False


def _parse_resolution(analysis) -> dict:
    if not isinstance(analysis, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-dict LLM response: {type(analysis)}")

    result = analysis.get("result")
    if isinstance(result, str):
        result = result.strip().lower()
    if result not in VALID_SIDES:
        raise gl.vm.UserError(f"{ERROR_LLM} Invalid 'result' value: {result!r}")

    explanation = analysis.get("explanation", "")
    if not isinstance(explanation, str):
        explanation = str(explanation)

    return {"result": result, "explanation": explanation}


def _fetch_source_evidence(source_url: str) -> str:
    """Best-effort fetch of the event's source_url content as grounding evidence.
    Never raises — falls back to reasoning-only if unfetchable, matching the
    graceful-degradation pattern used for bounty submission links."""
    if not source_url or not (source_url.startswith("http://") or source_url.startswith("https://")):
        return ""
    try:
        response = gl.nondet.web.request(source_url, method="GET")
    except Exception:
        return ""
    if response.status >= 400 or response.body is None:
        return ""
    try:
        text = response.body.decode("utf-8", errors="ignore")
    except Exception:
        return ""
    return text[:4000].strip()


def _resolve_outcome(title: str, description: str, category: str, end_date: str, source_url: str) -> dict:
    # Only plain str args here — storage-backed (@allow_storage) objects can't be
    # read inside a nondet block (leader/validator run in a sandboxed context that
    # can't pickle storage-class instances).
    evidence = _fetch_source_evidence(source_url)
    if evidence:
        evidence_block = (
            f'Fetched evidence from the provided source ({source_url}):\n{evidence}\n\n'
            "Ground your decision in this evidence above your own general knowledge."
        )
    else:
        evidence_block = (
            "No source was provided or it could not be fetched — resolve from your own knowledge and "
            "reasoning, and note in your explanation that this resolution is not grounded in a fetched source."
        )

    prompt = f"""You are an impartial prediction-market resolver. Determine the most likely real-world outcome of this event.

Event: "{title}"
Description / conditions: {description}
Category: {category}
Target date: {end_date}

{evidence_block}

Decide whether the outcome is "for" (YES, the event happened/will happen as described) or "against" (NO, it did not/will not).

Return ONLY a JSON object with this exact shape:
{{"result": "for" or "against", "explanation": "<2-3 sentences citing your reasoning>"}}"""

    analysis = gl.nondet.exec_prompt(prompt, response_format="json")
    return _parse_resolution(analysis)


class PredictionMarket(gl.Contract):
    next_event_id: u256
    next_bet_id: u256
    events: TreeMap[u256, BettingEvent]
    event_order: DynArray[u256]
    bets: TreeMap[u256, Bet]

    def __init__(self):
        self.next_event_id = u256(1)
        self.next_bet_id = u256(1)

    @gl.public.write
    def create_event(self, title: str, description: str, category: str, end_date: str, source_url: str = "") -> u256:
        event_id = self.next_event_id
        self.next_event_id = u256(event_id + 1)

        self.events[event_id] = BettingEvent(
            event_id=event_id,
            creator_address=gl.message.sender_address,
            title=title,
            description=description,
            category=category,
            end_date=end_date,
            status="open",
            result="",
            resolution="",
            total_for=u256(0),
            total_against=u256(0),
            paid_out=False,
            source_url=source_url,
        )
        self.event_order.append(event_id)
        return event_id

    @gl.public.write.payable
    def place_bet(self, event_id: u256, side: str) -> u256:
        if event_id not in self.events:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Event not found")
        if side not in VALID_SIDES:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Side must be 'for' or 'against'")
        if gl.message.value == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Bet amount must be greater than zero")

        event = self.events[event_id]
        if event.status != "open":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Event is not open for betting")

        amount = u256(gl.message.value)

        bet_id = self.next_bet_id
        self.next_bet_id = u256(bet_id + 1)
        self.bets[bet_id] = Bet(
            bet_id=bet_id,
            event_id=event_id,
            user_address=gl.message.sender_address,
            side=side,
            amount=amount,
        )

        if side == "for":
            event.total_for = u256(event.total_for + amount)
        else:
            event.total_against = u256(event.total_against + amount)
        self.events[event_id] = event

        return bet_id

    @gl.public.write
    def resolve_event(self, event_id: u256) -> None:
        if event_id not in self.events:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Event not found")

        event = self.events[event_id]
        if event.status != "open":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Event already resolved")
        if event.total_for == 0 and event.total_against == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} No bets placed on this event yet")

        # Settlement timing gate: deterministic across leader/validator (GenVM patches
        # the stdlib clock to the transaction timestamp, per GenLayer docs), so this is
        # a plain guard before the nondet block, not something nondet/consensus needs
        # to handle. If end_date isn't a well-formed date, skip the gate rather than
        # blocking resolution entirely.
        try:
            end = datetime.strptime(event.end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            end = None
        if end is not None and datetime.now(timezone.utc) < end:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Cannot resolve before end date ({event.end_date})")

        title = event.title
        description = event.description
        category = event.category
        end_date = event.end_date
        source_url = event.source_url

        def leader_fn():
            return _resolve_outcome(title, description, category, end_date, source_url)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            validator_result = leader_fn()
            return leaders_res.calldata["result"] == validator_result["result"]

        resolution = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        event.status = "resolved"
        event.result = resolution["result"]
        event.resolution = resolution["explanation"]
        self.events[event_id] = event

        if not event.paid_out:
            event.paid_out = True
            self.events[event_id] = event
            self._payout_winners(event)

    def _payout_winners(self, event: "BettingEvent") -> None:
        total_pool = u256(event.total_for + event.total_against)
        winning_total = event.total_for if event.result == "for" else event.total_against
        if winning_total == 0:
            return  # nobody bet on the winning side; pool stays in the contract

        for bet in self.bets.values():
            if bet.event_id != event.event_id or bet.side != event.result:
                continue
            payout = u256((bet.amount * total_pool) // winning_total)
            if payout > 0:
                gl.get_contract_at(bet.user_address).emit_transfer(value=payout)

    def _bet_dict(self, bet: "Bet") -> dict:
        return {
            "id": str(bet.bet_id),
            "user_address": bet.user_address.as_hex,
            "side": bet.side,
            "amount": str(bet.amount),
        }

    def _event_dict(self, event: "BettingEvent") -> dict:
        bets = [self._bet_dict(b) for b in self.bets.values() if b.event_id == event.event_id]
        return {
            "id": str(event.event_id),
            "creator_address": event.creator_address.as_hex,
            "title": event.title,
            "description": event.description,
            "category": event.category,
            "end_date": event.end_date,
            "source_url": event.source_url or None,
            "status": event.status,
            "result": event.result or None,
            "resolution": event.resolution or None,
            "total_for": str(event.total_for),
            "total_against": str(event.total_against),
            "bets": bets,
        }

    @gl.public.view
    def get_event(self, event_id: u256) -> dict:
        if event_id not in self.events:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Event not found")
        return self._event_dict(self.events[event_id])

    @gl.public.view
    def list_events(self) -> list[dict]:
        ids = list(self.event_order)
        ids.reverse()
        return [self._event_dict(self.events[eid]) for eid in ids]
