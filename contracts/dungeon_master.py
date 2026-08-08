# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass

from genlayer import *

ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"

# Paid from the contract's own balance (see fund_rewards) whenever a player levels up.
LEVEL_UP_REWARD = u256(5_000_000_000_000_000)  # 0.005 GEN

MAX_CONTEXT_TURNS = 6


@allow_storage
@dataclass
class Turn:
    turn_id: u256
    session_id: u256
    role: str  # "player" | "narrator"
    text: str


@allow_storage
@dataclass
class Session:
    session_id: u256
    player_address: Address
    hp: i32
    max_hp: i32
    attack: i32
    defense: i32
    gold: i32
    level: i32
    xp: i32
    status: str  # "playing" | "gameover"
    latest_choices: str  # JSON-encoded list[str]


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


def _parse_turn(analysis) -> dict:
    if not isinstance(analysis, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-dict LLM response: {type(analysis)}")

    narrative = analysis.get("narrative", "")
    if not isinstance(narrative, str) or not narrative.strip():
        raise gl.vm.UserError(f"{ERROR_LLM} Missing/invalid 'narrative'")

    def _int(key: str, default: int = 0) -> int:
        raw = analysis.get(key, default)
        try:
            return int(round(float(raw)))
        except (TypeError, ValueError):
            return default

    choices = analysis.get("choices", [])
    if not isinstance(choices, list):
        choices = []
    choices = [str(c) for c in choices][:4]
    if not choices:
        choices = ["Continue exploring", "Rest", "Search the area"]

    return {
        "narrative": narrative.strip(),
        "hp_change": _int("hpChange"),
        "gold_change": _int("goldChange"),
        "xp_gain": max(0, _int("xpGain")),
        "choices": choices,
    }


def _narrate(
    hp: int, max_hp: int, attack: int, defense: int, gold: int, level: int,
    history_text: str, action: str, is_start: bool,
) -> dict:
    # Only plain str/int args here — storage-backed (@allow_storage) objects can't be
    # read inside a nondet block (leader/validator run in a sandboxed context that
    # can't pickle storage-class instances).
    if is_start:
        task = 'Start a new dark-fantasy dungeon crawl adventure. Set the scene dramatically and give the player an opening situation.'
    else:
        task = f'The player chooses to: "{action}". Narrate the outcome dramatically and update their stats accordingly.'

    prompt = f"""You are a dark fantasy RPG Game Master running a text-based dungeon crawler. Narrate in second person ("You enter the chamber..."). Keep the narrative under 150 words.

Player stats: HP {hp}/{max_hp}, ATK {attack}, DEF {defense}, Gold {gold}, Level {level}

Recent history:
{history_text or "(start of adventure)"}

Task: {task}

Rules:
- Include concrete combat damage numbers when fighting.
- hpChange can be negative (damage) or positive (healing); be fair but dangerous, death should be possible.
- Suggest 3-4 new choices for what the player can do next.

Return ONLY a JSON object with this exact shape:
{{"narrative": "<text>", "hpChange": <int>, "goldChange": <int>, "xpGain": <int, >=0>, "choices": ["...", "...", "..."]}}"""

    analysis = gl.nondet.exec_prompt(prompt, response_format="json")
    return _parse_turn(analysis)


class DungeonMaster(gl.Contract):
    next_session_id: u256
    next_turn_id: u256
    sessions: TreeMap[u256, Session]
    session_order: DynArray[u256]
    turns: TreeMap[u256, Turn]

    def __init__(self):
        self.next_session_id = u256(1)
        self.next_turn_id = u256(1)

    @gl.public.write.payable
    def fund_rewards(self) -> None:
        pass

    def _recent_history(self, session_id: u256) -> str:
        relevant = [t for t in self.turns.values() if t.session_id == session_id]
        relevant = relevant[-MAX_CONTEXT_TURNS:]
        lines = [f"{'Player' if t.role == 'player' else 'Narrator'}: {t.text}" for t in relevant]
        return "\n".join(lines)

    def _append_turn(self, session_id: u256, role: str, text: str) -> None:
        turn_id = self.next_turn_id
        self.next_turn_id = u256(turn_id + 1)
        self.turns[turn_id] = Turn(turn_id=turn_id, session_id=session_id, role=role, text=text)

    def _apply_effects(self, session: "Session", hp_change: int, gold_change: int, xp_gain: int) -> bool:
        """Applies stat deltas in place. Returns True if the player leveled up this turn."""
        session.hp = i32(max(0, min(session.max_hp, session.hp + hp_change)))
        session.gold = i32(max(0, session.gold + gold_change))
        session.xp = i32(session.xp + xp_gain)

        leveled_up = False
        xp_needed = session.level * 50
        if session.xp >= xp_needed:
            session.level = i32(session.level + 1)
            session.xp = i32(session.xp - xp_needed)
            session.max_hp = i32(session.max_hp + 20)
            session.hp = session.max_hp
            session.attack = i32(session.attack + 3)
            session.defense = i32(session.defense + 2)
            leveled_up = True

        if session.hp <= 0:
            session.status = "gameover"

        return leveled_up

    @gl.public.write
    def start_session(self) -> u256:
        # All storage writes are deferred until after the nondet block resolves —
        # GenVM replays leader/validator runs, and writes made *before* a nondet
        # call are not reliably committed if more writes follow it.
        def leader_fn():
            return _narrate(100, 100, 10, 5, 0, 1, "", "", is_start=True)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            validator_result = leader_fn()
            # Opening scene: both must report no mechanical stat changes and give choices.
            return (
                leaders_res.calldata["hp_change"] == 0
                and validator_result["hp_change"] == 0
                and len(leaders_res.calldata["choices"]) > 0
                and len(validator_result["choices"]) > 0
            )

        turn = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        session_id = self.next_session_id
        self.next_session_id = u256(session_id + 1)

        session = Session(
            session_id=session_id,
            player_address=gl.message.sender_address,
            hp=i32(100), max_hp=i32(100), attack=i32(10), defense=i32(5),
            gold=i32(0), level=i32(1), xp=i32(0),
            status="playing",
            latest_choices=json.dumps(turn["choices"]),
        )
        self.sessions[session_id] = session
        self.session_order.append(session_id)
        self._append_turn(session_id, "narrator", turn["narrative"])

        return session_id

    @gl.public.write
    def take_turn(self, session_id: u256, action: str) -> dict:
        if session_id not in self.sessions:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Session not found")

        session = self.sessions[session_id]
        if session.status != "playing":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Session already ended")
        if session.player_address != gl.message.sender_address:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Not your session")

        # History reflects only already-committed turns; the current action is passed
        # separately below and only written to storage after the nondet block resolves.
        history = self._recent_history(session_id)
        hp, max_hp, attack, defense, gold, level = (
            int(session.hp), int(session.max_hp), int(session.attack),
            int(session.defense), int(session.gold), int(session.level),
        )

        def leader_fn():
            return _narrate(hp, max_hp, attack, defense, gold, level, history, action, is_start=False)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            validator_result = leader_fn()
            leader_dmg = leaders_res.calldata["hp_change"] < 0
            validator_dmg = validator_result["hp_change"] < 0
            leader_heal = leaders_res.calldata["hp_change"] > 0
            validator_heal = validator_result["hp_change"] > 0
            # Validators must agree on the *category* of outcome (damage / heal / neutral),
            # not the exact narrative text or precise numbers.
            return leader_dmg == validator_dmg and leader_heal == validator_heal

        turn = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        self._append_turn(session_id, "player", action)
        self._append_turn(session_id, "narrator", turn["narrative"])
        leveled_up = self._apply_effects(session, turn["hp_change"], turn["gold_change"], turn["xp_gain"])
        session.latest_choices = json.dumps(turn["choices"]) if session.status == "playing" else "[]"
        self.sessions[session_id] = session

        reward_paid = u256(0)
        if leveled_up and session.status == "playing" and self.balance >= LEVEL_UP_REWARD:
            reward_paid = LEVEL_UP_REWARD
            gl.get_contract_at(session.player_address).emit_transfer(value=reward_paid)

        return {
            "narrative": turn["narrative"],
            "hp_change": turn["hp_change"],
            "gold_change": turn["gold_change"],
            "xp_gain": turn["xp_gain"],
            "leveled_up": leveled_up,
            "reward_paid": str(reward_paid),
            "status": session.status,
        }

    def _session_dict(self, session: "Session") -> dict:
        return {
            "id": str(session.session_id),
            "player_address": session.player_address.as_hex,
            "hp": int(session.hp),
            "max_hp": int(session.max_hp),
            "attack": int(session.attack),
            "defense": int(session.defense),
            "gold": int(session.gold),
            "level": int(session.level),
            "xp": int(session.xp),
            "status": session.status,
            "choices": json.loads(session.latest_choices) if session.latest_choices else [],
        }

    @gl.public.view
    def get_session(self, session_id: u256) -> dict:
        if session_id not in self.sessions:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Session not found")
        d = self._session_dict(self.sessions[session_id])
        d["turns"] = [
            {"role": t.role, "text": t.text}
            for t in self.turns.values()
            if t.session_id == session_id
        ]
        return d

    @gl.public.view
    def list_sessions(self) -> list[dict]:
        ids = list(self.session_order)
        ids.reverse()
        return [self._session_dict(self.sessions[sid]) for sid in ids]
