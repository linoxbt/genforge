# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass

from genlayer import *

ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"

ACCEPT_THRESHOLD = 70
# Leader/validator scores may legitimately diverge a little (LLM is non-deterministic);
# they must still agree on the accept/reject *decision* and stay within this tolerance.
SCORE_TOLERANCE = 20


@allow_storage
@dataclass
class Submission:
    submission_id: u256
    bounty_id: u256
    submitter_address: Address
    description: str
    link: str
    score: i32  # -1 == not yet reviewed
    feedback: str
    strengths: str  # JSON-encoded list[str]
    weaknesses: str  # JSON-encoded list[str]
    status: str  # "pending" | "accepted" | "rejected"


@allow_storage
@dataclass
class Bounty:
    bounty_id: u256
    creator_address: Address
    title: str
    description: str
    criteria: str
    reward: u256  # atto-GEN, escrowed from message.value at creation
    status: str  # "open" | "completed"
    paid_out: bool


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    """Canonical validator-side handling when the leader run itself errored."""
    leader_msg = getattr(leaders_res, "message", "") or ""
    try:
        leader_fn()
        # Validator succeeded where the leader errored -> disagree, force rotation.
        return False
    except gl.vm.UserError as e:
        validator_msg = getattr(e, "message", str(e))
        if validator_msg.startswith(ERROR_EXPECTED):
            return validator_msg == leader_msg
        # LLM/unknown errors: never agree on a broken result, force rotation instead.
        return False
    except Exception:
        return False


def _parse_review(analysis) -> dict:
    """Defensively parse the LLM's JSON review into a normalized dict."""
    if not isinstance(analysis, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-dict LLM response: {type(analysis)}")

    raw_score = analysis.get("score")
    if raw_score is None:
        for alt in ("rating", "points", "value"):
            if alt in analysis:
                raw_score = analysis[alt]
                break
    if raw_score is None:
        raise gl.vm.UserError(f"{ERROR_LLM} Missing 'score'. Keys: {list(analysis.keys())}")

    try:
        score = max(0, min(100, int(round(float(str(raw_score).strip())))))
    except (ValueError, TypeError):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-numeric score: {raw_score}")

    feedback = analysis.get("feedback", "")
    if not isinstance(feedback, str):
        feedback = str(feedback)

    strengths = analysis.get("strengths", []) or []
    if not isinstance(strengths, list):
        strengths = [str(strengths)]
    weaknesses = analysis.get("weaknesses", []) or []
    if not isinstance(weaknesses, list):
        weaknesses = [str(weaknesses)]

    return {
        "score": score,
        "feedback": feedback,
        "strengths": [str(s) for s in strengths],
        "weaknesses": [str(w) for w in weaknesses],
    }


def _fetch_link_evidence(link: str) -> str:
    """Best-effort fetch of the submission link's content as grounding evidence.
    Never raises — an unfetchable link (private repo, non-HTTP, 4xx/5xx, timeout)
    degrades to description-only scoring rather than hard-failing the whole review."""
    if not link or not (link.startswith("http://") or link.startswith("https://")):
        return ""
    try:
        response = gl.nondet.web.request(link, method="GET")
    except Exception:
        return ""
    if response.status >= 400 or response.body is None:
        return ""
    try:
        text = response.body.decode("utf-8", errors="ignore")
    except Exception:
        return ""
    return text[:4000].strip()


def _score_submission(
    bounty_title: str,
    bounty_description: str,
    bounty_criteria: str,
    submission_description: str,
    submission_link: str,
) -> dict:
    # NOTE: only plain str/int args here — storage-backed (@allow_storage) objects
    # cannot be read inside a nondet block (leader/validator run in a separate
    # sandboxed context that can't pickle storage-class instances).
    link_evidence = _fetch_link_evidence(submission_link)
    evidence_block = (
        f"Fetched content from the submission link (evidence, may be partial):\n{link_evidence}"
        if link_evidence
        else "(Submission link content could not be fetched — score from the description alone and note this in feedback.)"
    )

    prompt = f"""You are an impartial bounty reviewer. Evaluate this submission against the bounty's acceptance criteria and be fair but rigorous.

Bounty title: {bounty_title}
Bounty description: {bounty_description}
Acceptance criteria: {bounty_criteria}

Submission description: {submission_description}
Submission link: {submission_link}

{evidence_block}

Score the submission from 0 to 100 based on how well it satisfies the acceptance criteria. Prioritize the fetched evidence above over the submitter's self-description when they conflict.

Return ONLY a JSON object with this exact shape:
{{"score": <integer 0-100>, "feedback": "<2-3 sentence explanation>", "strengths": ["..."], "weaknesses": ["..."]}}"""

    analysis = gl.nondet.exec_prompt(prompt, response_format="json")
    return _parse_review(analysis)


class BountyBoard(gl.Contract):
    next_bounty_id: u256
    next_submission_id: u256
    bounties: TreeMap[u256, Bounty]
    bounty_order: DynArray[u256]
    submissions: TreeMap[u256, Submission]

    def __init__(self):
        self.next_bounty_id = u256(1)
        self.next_submission_id = u256(1)

    @gl.public.write.payable
    def create_bounty(self, title: str, description: str, criteria: str) -> u256:
        if gl.message.value == 0:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Reward must be greater than zero")

        bounty_id = self.next_bounty_id
        self.next_bounty_id = u256(bounty_id + 1)

        self.bounties[bounty_id] = Bounty(
            bounty_id=bounty_id,
            creator_address=gl.message.sender_address,
            title=title,
            description=description,
            criteria=criteria,
            reward=u256(gl.message.value),
            status="open",
            paid_out=False,
        )
        self.bounty_order.append(bounty_id)
        return bounty_id

    @gl.public.write
    def submit_work(self, bounty_id: u256, description: str, link: str) -> u256:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Bounty not found")

        bounty = self.bounties[bounty_id]
        if bounty.status != "open":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Bounty is not open for submissions")

        submission_id = self.next_submission_id
        self.next_submission_id = u256(submission_id + 1)

        self.submissions[submission_id] = Submission(
            submission_id=submission_id,
            bounty_id=bounty_id,
            submitter_address=gl.message.sender_address,
            description=description,
            link=link,
            score=-1,
            feedback="",
            strengths="[]",
            weaknesses="[]",
            status="pending",
        )
        return submission_id

    @gl.public.write
    def review_submission(self, bounty_id: u256, submission_id: u256) -> None:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Bounty not found")
        if submission_id not in self.submissions:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Submission not found")

        bounty = self.bounties[bounty_id]
        submission = self.submissions[submission_id]

        if submission.bounty_id != bounty_id:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Submission does not belong to this bounty")
        if submission.status != "pending":
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Submission already reviewed")

        bounty_title = bounty.title
        bounty_description = bounty.description
        bounty_criteria = bounty.criteria
        submission_description = submission.description
        submission_link = submission.link

        def leader_fn():
            return _score_submission(
                bounty_title, bounty_description, bounty_criteria, submission_description, submission_link
            )

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            validator_result = leader_fn()
            leader_score = leaders_res.calldata["score"]
            validator_score = validator_result["score"]

            leader_pass = leader_score >= ACCEPT_THRESHOLD
            validator_pass = validator_score >= ACCEPT_THRESHOLD
            if leader_pass != validator_pass:
                return False

            return abs(leader_score - validator_score) <= SCORE_TOLERANCE

        review = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        score = review["score"]
        accepted = score >= ACCEPT_THRESHOLD

        submission.score = score
        submission.feedback = review["feedback"]
        submission.strengths = json.dumps(review["strengths"])
        submission.weaknesses = json.dumps(review["weaknesses"])
        submission.status = "accepted" if accepted else "rejected"
        self.submissions[submission_id] = submission

        if accepted:
            bounty.status = "completed"
            if not bounty.paid_out:
                bounty.paid_out = True
                self.bounties[bounty_id] = bounty
                gl.get_contract_at(submission.submitter_address).emit_transfer(value=bounty.reward)
                return

        self.bounties[bounty_id] = bounty

    def _submission_dict(self, submission: "Submission") -> dict:
        return {
            "id": str(submission.submission_id),
            "submitter_address": submission.submitter_address.as_hex,
            "description": submission.description,
            "link": submission.link,
            "score": submission.score if submission.score >= 0 else None,
            "feedback": submission.feedback,
            "strengths": json.loads(submission.strengths) if submission.strengths else [],
            "weaknesses": json.loads(submission.weaknesses) if submission.weaknesses else [],
            "status": submission.status,
        }

    def _bounty_dict(self, bounty: "Bounty") -> dict:
        subs = [
            self._submission_dict(s)
            for s in self.submissions.values()
            if s.bounty_id == bounty.bounty_id
        ]
        return {
            "id": str(bounty.bounty_id),
            "creator_address": bounty.creator_address.as_hex,
            "title": bounty.title,
            "description": bounty.description,
            "criteria": bounty.criteria,
            "reward": str(bounty.reward),
            "status": bounty.status,
            "submissions": subs,
        }

    @gl.public.view
    def get_bounty(self, bounty_id: u256) -> dict:
        if bounty_id not in self.bounties:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Bounty not found")
        return self._bounty_dict(self.bounties[bounty_id])

    @gl.public.view
    def list_bounties(self) -> list[dict]:
        ids = list(self.bounty_order)
        ids.reverse()  # newest first
        return [self._bounty_dict(self.bounties[bid]) for bid in ids]
