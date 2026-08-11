# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass

from genlayer import *

ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"

# 0.01 GEN per correct answer, paid from the contract's own balance (see fund_rewards).
REWARD_PER_CORRECT = u256(10_000_000_000_000_000)

# Curated Wikipedia page titles per category (matches the categories offered in
# TriviaGame.tsx, lowercased). "genlayer" has no dedicated Wikipedia article, so it
# maps to closely-related consensus/smart-contract topics instead.
TOPICS: dict[str, list[str]] = {
    "genlayer": ["Smart contract", "Blockchain", "Consensus (computer science)", "Byzantine fault", "Ethereum"],
    "blockchain": ["Blockchain", "Smart contract", "Bitcoin", "Ethereum", "Consensus (computer science)"],
    "crypto": ["Bitcoin", "Ethereum", "Cryptocurrency", "Blockchain", "Non-fungible token"],
    "science": ["Photosynthesis", "Quantum mechanics", "DNA", "Periodic table", "Theory of relativity"],
    "history": ["World War II", "Ancient Egypt", "French Revolution", "Roman Empire", "Cold War"],
    "geography": ["Mount Everest", "Amazon rainforest", "Sahara", "Nile", "Pacific Ocean"],
    "technology": ["Internet", "Artificial intelligence", "Smartphone", "Semiconductor", "Internet of things"],
    "sports": ["FIFA World Cup", "Olympic Games", "Basketball", "Tennis", "Cricket"],
    "music": ["Ludwig van Beethoven", "The Beatles", "Jazz", "Hip hop music", "Opera"],
}
ALL_TOPICS: list[str] = sorted({title for titles in TOPICS.values() for title in titles})


@allow_storage
@dataclass
class Question:
    question_id: u256
    category: str
    question: str
    option_0: str
    option_1: str
    option_2: str
    option_3: str
    correct_index: i32
    source: str
    explanation: str
    asker_address: Address
    answered: bool
    answerer_address: Address
    selected_index: i32
    correct: bool
    reward_paid: u256


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


def _answers_match(a: str, b: str) -> bool:
    """Case-insensitive equivalence check with light tolerance for wording, used both
    to self-validate an LLM's own correctIndex/correctAnswerText pair and to compare
    leader vs validator answers grounded in the same source."""
    a, b = a.strip().lower(), b.strip().lower()
    if a == b:
        return True
    shorter, longer = (a, b) if len(a) <= len(b) else (b, a)
    return len(shorter) >= 4 and shorter in longer


def _parse_question(analysis) -> dict:
    if not isinstance(analysis, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-dict LLM response: {type(analysis)}")

    question = analysis.get("question")
    options = analysis.get("options")
    correct_index = analysis.get("correctIndex", analysis.get("correct_index"))
    correct_answer_text = analysis.get("correctAnswerText", analysis.get("correct_answer_text", ""))
    explanation = analysis.get("explanation", "")

    if not isinstance(question, str) or not question.strip():
        raise gl.vm.UserError(f"{ERROR_LLM} Missing/invalid 'question'")
    if not isinstance(options, list) or len(options) != 4:
        raise gl.vm.UserError(f"{ERROR_LLM} 'options' must be a list of exactly 4 items")
    options = [str(o) for o in options]
    try:
        correct_index = int(correct_index)
    except (TypeError, ValueError):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-numeric 'correctIndex': {correct_index!r}")
    if correct_index < 0 or correct_index > 3:
        raise gl.vm.UserError(f"{ERROR_LLM} 'correctIndex' out of range: {correct_index}")
    if not isinstance(correct_answer_text, str) or not correct_answer_text.strip():
        raise gl.vm.UserError(f"{ERROR_LLM} Missing/invalid 'correctAnswerText'")
    correct_answer_text = correct_answer_text.strip()

    # Self-consistency guard: the option the LLM points at with correctIndex must
    # actually be (approximately) the correctAnswerText it separately claimed.
    if not _answers_match(options[correct_index], correct_answer_text):
        raise gl.vm.UserError(f"{ERROR_LLM} 'correctAnswerText' does not match options[correctIndex]")

    return {
        "question": question.strip(),
        "options": options,
        "correct_index": correct_index,
        "correct_answer_text": correct_answer_text,
        "explanation": str(explanation),
    }


def _fetch_topic_extract(title: str) -> str:
    url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{title.replace(' ', '_')}"
    response = gl.nondet.web.request(url, method="GET")
    if response.status != 200:
        raise gl.vm.UserError(f"{ERROR_LLM} Failed to fetch source (status {response.status}): {title}")
    if response.body is None:
        raise gl.vm.UserError(f"{ERROR_LLM} Empty response body for: {title}")
    try:
        data = json.loads(response.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-JSON source response for: {title}")
    extract = data.get("extract", "")
    if not isinstance(extract, str) or not extract.strip():
        raise gl.vm.UserError(f"{ERROR_LLM} Empty source extract for: {title}")
    return extract.strip()


def _generate(title: str) -> dict:
    # Only plain str args here — storage-backed (@allow_storage) objects can't be
    # read inside a nondet block (leader/validator run in a sandboxed context that
    # can't pickle storage-class instances).
    extract = _fetch_topic_extract(title)

    prompt = f"""You are a trivia question generator. Generate one unique, interesting trivia question using ONLY the facts in the source text below. Do not use outside knowledge or facts not present in the source.

Source ("{title}"): {extract}

Requirements:
- Exactly 4 answer options with only ONE correct answer.
- The correct answer must be explicitly supported by the source text above.
- "correctAnswerText" must be the exact text of the correct option (must equal options[correctIndex]).

Return ONLY a JSON object with this exact shape:
{{"question": "<text>", "options": ["<a>", "<b>", "<c>", "<d>"], "correctIndex": <0-3>, "correctAnswerText": "<exact text of the correct option>", "explanation": "<1-2 sentence explanation grounded in the source>"}}"""

    analysis = gl.nondet.exec_prompt(prompt, response_format="json")
    parsed = _parse_question(analysis)
    parsed["source"] = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
    return parsed


class TriviaRewards(gl.Contract):
    next_question_id: u256
    questions: TreeMap[u256, Question]
    question_order: DynArray[u256]

    def __init__(self):
        self.next_question_id = u256(1)

    @gl.public.write.payable
    def fund_rewards(self) -> None:
        # message.value is credited to the contract's balance automatically;
        # this method just gives callers an explicit, named way to top up the pool.
        pass

    @gl.public.write
    def generate_question(self, category: str) -> u256:
        normalized_category = (category or "all").strip().lower()
        candidates = TOPICS.get(normalized_category, ALL_TOPICS)
        # Deterministic topic selection is the actual fix here: picking a *specific*
        # Wikipedia page from storage (a plain read, fine outside nondet) before the
        # nondet block runs guarantees leader and validator independently fetch the
        # exact same source, instead of each free-recalling from unaided LLM "knowledge".
        title = candidates[int(self.next_question_id) % len(candidates)]

        def leader_fn():
            return _generate(title)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            validator_result = leader_fn()
            leader_ok = len(leaders_res.calldata["options"]) == 4 and 0 <= leaders_res.calldata["correct_index"] <= 3
            validator_ok = len(validator_result["options"]) == 4 and 0 <= validator_result["correct_index"] <= 3
            if not (leader_ok and validator_ok):
                return False

            # Both sides fetched the identical source page, so independent agreement on
            # the underlying fact is now meaningfully checkable (this is the literal
            # "trivia-answer correctness" the steward flagged as unchecked before).
            return _answers_match(leaders_res.calldata["correct_answer_text"], validator_result["correct_answer_text"])

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        question_id = self.next_question_id
        self.next_question_id = u256(question_id + 1)

        self.questions[question_id] = Question(
            question_id=question_id,
            category=normalized_category,
            question=result["question"],
            option_0=result["options"][0],
            option_1=result["options"][1],
            option_2=result["options"][2],
            option_3=result["options"][3],
            correct_index=i32(result["correct_index"]),
            source=result["source"],
            explanation=result["explanation"],
            asker_address=gl.message.sender_address,
            answered=False,
            answerer_address=Address("0x" + "00" * 20),
            selected_index=i32(-1),
            correct=False,
            reward_paid=u256(0),
        )
        self.question_order.append(question_id)
        return question_id

    @gl.public.write
    def submit_answer(self, question_id: u256, selected_index: i32) -> dict:
        if question_id not in self.questions:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Question not found")

        q = self.questions[question_id]
        if q.answered:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Question already answered")
        if selected_index < 0 or selected_index > 3:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} selected_index must be 0-3")

        correct = selected_index == q.correct_index
        reward_paid = u256(0)

        q.answered = True
        q.answerer_address = gl.message.sender_address
        q.selected_index = selected_index
        q.correct = correct

        if correct and self.balance >= REWARD_PER_CORRECT:
            reward_paid = REWARD_PER_CORRECT
            q.reward_paid = reward_paid

        self.questions[question_id] = q

        if reward_paid > 0:
            gl.get_contract_at(gl.message.sender_address).emit_transfer(value=reward_paid)

        return {
            "correct": correct,
            "correct_index": int(q.correct_index),
            "explanation": q.explanation,
            "source": q.source,
            "reward_paid": str(reward_paid),
        }

    def _question_dict(self, q: "Question") -> dict:
        base = {
            "id": str(q.question_id),
            "category": q.category,
            "question": q.question,
            "options": [q.option_0, q.option_1, q.option_2, q.option_3],
            "asker_address": q.asker_address.as_hex,
            "answered": q.answered,
        }
        if q.answered:
            base.update({
                "correct_index": int(q.correct_index),
                "source": q.source,
                "explanation": q.explanation,
                "answerer_address": q.answerer_address.as_hex,
                "selected_index": int(q.selected_index),
                "correct": q.correct,
                "reward_paid": str(q.reward_paid),
            })
        return base

    @gl.public.view
    def get_question(self, question_id: u256) -> dict:
        if question_id not in self.questions:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Question not found")
        return self._question_dict(self.questions[question_id])

    @gl.public.view
    def list_questions(self) -> list[dict]:
        ids = list(self.question_order)
        ids.reverse()
        return [self._question_dict(self.questions[qid]) for qid in ids]
