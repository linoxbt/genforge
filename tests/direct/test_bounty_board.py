"""Direct-mode tests for contracts/bounty_board.py.

Covers: escrow/value guards, accept/reject threshold decisions, double-review
guard, and the new link-fetch grounding — including graceful degradation when
the submission link can't be fetched (private repo, 404, non-HTTP).
"""

import json

REVIEW_PATTERN = r".*impartial bounty reviewer.*"
LINK_PATTERN = r".*example\.com/proof.*"


def _review_response(score=85, feedback="Meets the criteria well."):
    return json.dumps({
        "score": score,
        "feedback": feedback,
        "strengths": ["Clear implementation"],
        "weaknesses": [],
    })


def test_create_bounty_requires_value(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/bounty_board.py")
    direct_vm.sender = direct_alice
    direct_vm.value = 0

    with direct_vm.expect_revert("Reward must be greater than zero"):
        contract.create_bounty("Title", "Description", "Criteria")


def test_review_submission_accepts_and_pays_out(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/bounty_board.py")
    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty("Title", "Description", "Criteria")
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    submission_id = contract.submit_work(bounty_id, "I did the thing", "https://example.com/proof")

    direct_vm.mock_web(LINK_PATTERN, {"status": 200, "body": "Proof of work: fully implemented and tested."})
    direct_vm.mock_llm(REVIEW_PATTERN, _review_response(score=90))
    contract.review_submission(bounty_id, submission_id)

    bounty = contract.get_bounty(bounty_id)
    assert bounty["status"] == "completed"
    assert bounty["submissions"][0]["status"] == "accepted"
    assert bounty["submissions"][0]["score"] == 90


def test_review_submission_rejects_low_score(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/bounty_board.py")
    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty("Title", "Description", "Criteria")
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    submission_id = contract.submit_work(bounty_id, "Half-finished attempt", "https://example.com/proof")

    direct_vm.mock_web(LINK_PATTERN, {"status": 200, "body": "Incomplete, missing tests."})
    direct_vm.mock_llm(REVIEW_PATTERN, _review_response(score=40))
    contract.review_submission(bounty_id, submission_id)

    bounty = contract.get_bounty(bounty_id)
    assert bounty["status"] == "open"
    assert bounty["submissions"][0]["status"] == "rejected"


def test_review_submission_already_reviewed_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/bounty_board.py")
    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty("Title", "Description", "Criteria")
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    submission_id = contract.submit_work(bounty_id, "Done", "https://example.com/proof")

    direct_vm.mock_web(LINK_PATTERN, {"status": 200, "body": "Looks complete."})
    direct_vm.mock_llm(REVIEW_PATTERN, _review_response(score=90))
    contract.review_submission(bounty_id, submission_id)

    with direct_vm.expect_revert("already reviewed"):
        contract.review_submission(bounty_id, submission_id)


def test_score_submission_degrades_gracefully_on_unfetchable_link(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/bounty_board.py")
    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty("Title", "Description", "Criteria")
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    submission_id = contract.submit_work(bounty_id, "Done, trust me", "https://private-repo.example/unreachable")

    # No mock_web registered for this URL and no live handler -> the fetch fails
    # (MockNotFoundError), which _fetch_link_evidence must swallow rather than
    # letting the whole review revert.
    direct_vm.mock_llm(REVIEW_PATTERN, _review_response(score=75))
    contract.review_submission(bounty_id, submission_id)

    bounty = contract.get_bounty(bounty_id)
    assert bounty["submissions"][0]["status"] == "accepted"
    assert bounty["submissions"][0]["score"] == 75


def test_submit_work_on_closed_bounty_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/bounty_board.py")
    direct_vm.sender = direct_alice
    direct_vm.value = 10**18
    bounty_id = contract.create_bounty("Title", "Description", "Criteria")
    direct_vm.value = 0

    direct_vm.sender = direct_bob
    submission_id = contract.submit_work(bounty_id, "Done", "https://example.com/proof")
    direct_vm.mock_web(LINK_PATTERN, {"status": 200, "body": "Complete."})
    direct_vm.mock_llm(REVIEW_PATTERN, _review_response(score=90))
    contract.review_submission(bounty_id, submission_id)

    with direct_vm.expect_revert("not open"):
        contract.submit_work(bounty_id, "Another attempt", "https://example.com/proof2")
