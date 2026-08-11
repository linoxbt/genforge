"""Direct-mode tests for contracts/trivia_rewards.py.

Covers: Wikipedia-grounded question generation, the LLM self-consistency guard
(correctAnswerText must match options[correctIndex]), graceful failure on an
unfetchable source, reward payout guards, and — via `direct_vm.run_validator()` —
the validator_fn now catching a leader/validator answer mismatch, which is the
literal "trivia-answer correctness" gap the GenLayer Portal steward flagged.
"""

import json

WIKI_PATTERN = r".*wikipedia\.org/api/rest_v1/page/summary.*"
LLM_PATTERN = r".*trivia question generator.*"


def _wiki_mock(extract="The Great Barrier Reef is located off the coast of Queensland, Australia."):
    return {"status": 200, "body": json.dumps({"extract": extract})}


def _question_response(correct="Australia", options=None, correct_index=0):
    return json.dumps({
        "question": "Where is the Great Barrier Reef located?",
        "options": options or ["Australia", "Brazil", "Indonesia", "Fiji"],
        "correctIndex": correct_index,
        "correctAnswerText": correct,
        "explanation": "It's off the coast of Queensland, Australia.",
    })


def _generate_question(contract, direct_vm, category="geography"):
    direct_vm.mock_web(WIKI_PATTERN, _wiki_mock())
    direct_vm.mock_llm(LLM_PATTERN, _question_response())
    return contract.generate_question(category)


def test_generate_question_stores_wikipedia_source(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice

    question_id = _generate_question(contract, direct_vm)

    from genlayer.py.types import Address

    q = contract.get_question(question_id)
    assert q["category"] == "geography"
    assert len(q["options"]) == 4
    assert q["asker_address"] == Address(direct_alice).as_hex


def test_generate_question_reverts_on_unfetchable_source(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(WIKI_PATTERN, {"status": 404, "body": ""})

    with direct_vm.expect_revert("Failed to fetch source"):
        contract.generate_question("geography")


def test_generate_question_reverts_on_self_inconsistent_answer(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(WIKI_PATTERN, _wiki_mock())
    # correctIndex points at "Australia" but correctAnswerText claims something
    # unrelated — the LLM's own answer is internally inconsistent.
    direct_vm.mock_llm(LLM_PATTERN, _question_response(correct="Purple elephant migration"))

    with direct_vm.expect_revert("does not match options[correctIndex]"):
        contract.generate_question("geography")


def test_submit_answer_correct_pays_reward(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.deal(direct_vm._contract_address, 10**18)

    direct_vm.sender = direct_alice
    question_id = _generate_question(contract, direct_vm)

    direct_vm.sender = direct_bob
    result = contract.submit_answer(question_id, 0)

    assert result["correct"] is True
    assert int(result["reward_paid"]) == 10_000_000_000_000_000


def test_submit_answer_already_answered_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice
    question_id = _generate_question(contract, direct_vm)

    direct_vm.sender = direct_bob
    contract.submit_answer(question_id, 0)
    with direct_vm.expect_revert("already answered"):
        contract.submit_answer(question_id, 1)


def test_submit_answer_out_of_range_reverts(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice
    question_id = _generate_question(contract, direct_vm)

    with direct_vm.expect_revert("selected_index must be 0-3"):
        contract.submit_answer(question_id, 7)


def test_generate_question_validator_agrees_on_matching_answer(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(WIKI_PATTERN, _wiki_mock())
    direct_vm.mock_llm(LLM_PATTERN, _question_response(correct="Australia"))
    contract.generate_question("geography")

    # Validator independently fetches the same source and lands on the same answer.
    direct_vm.clear_mocks()
    direct_vm.mock_web(WIKI_PATTERN, _wiki_mock())
    direct_vm.mock_llm(LLM_PATTERN, _question_response(correct="Australia", options=["Australia", "Brazil", "Fiji", "Peru"]))
    assert direct_vm.run_validator() is True


def test_generate_question_validator_disagrees_on_different_answer(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/trivia_rewards.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_web(WIKI_PATTERN, _wiki_mock())
    direct_vm.mock_llm(LLM_PATTERN, _question_response(correct="Australia"))
    contract.generate_question("geography")

    # Simulate the validator's independent leader_fn() call landing on a different
    # fact/answer entirely. Before this fix, validator_fn only checked structural
    # well-formedness (4 options, index in range) and never compared the answer —
    # this scenario would have passed. Now it must be rejected.
    direct_vm.clear_mocks()
    direct_vm.mock_web(WIKI_PATTERN, _wiki_mock())
    direct_vm.mock_llm(LLM_PATTERN, _question_response(correct="Brazil", options=["Brazil", "Australia", "Fiji", "Peru"]))
    assert direct_vm.run_validator() is False
