"""Direct-mode tests for contracts/dungeon_master.py.

Covers: state transitions, guards, deterministic clamping math, and — via the
`direct_vm.run_validator()` cheat code — the validator_fn disagreement behavior
the GenLayer Portal steward flagged as missing (XP/gold payout correctness).
"""

import json

START_PATTERN = r".*Start a new dark-fantasy.*"


def _start_response(narrative="You awaken in a dark chamber.", choices=None):
    return json.dumps({
        "narrative": narrative,
        "hpChange": 0,
        "goldChange": 0,
        "xpGain": 0,
        "choices": choices or ["Go north", "Go south", "Search"],
    })


def _turn_response(narrative="You proceed.", hp=-5, gold=10, xp=20, choices=None):
    return json.dumps({
        "narrative": narrative,
        "hpChange": hp,
        "goldChange": gold,
        "xpGain": xp,
        "choices": choices or ["Fight", "Flee", "Hide"],
    })


def _turn_pattern(action: str) -> str:
    return rf'.*chooses to: "{action}".*'


def test_start_session_creates_session(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())

    session_id = contract.start_session()

    session = contract.get_session(session_id)
    assert session["hp"] == 100
    assert session["level"] == 1
    assert session["status"] == "playing"
    assert len(session["choices"]) > 0


def test_take_turn_applies_damage_gold_and_xp(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    direct_vm.mock_llm(_turn_pattern("attack"), _turn_response(hp=-15, gold=5, xp=10))
    result = contract.take_turn(session_id, "attack")

    assert result["hp_change"] == -15
    session = contract.get_session(session_id)
    assert session["hp"] == 85
    assert session["gold"] == 5
    assert session["xp"] == 10


def test_take_turn_not_your_session_reverts(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Not your session"):
        contract.take_turn(session_id, "attack")


def test_take_turn_reverts_after_gameover(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    direct_vm.mock_llm(_turn_pattern("attack"), _turn_response(hp=-999, gold=0, xp=0))
    contract.take_turn(session_id, "attack")
    assert contract.get_session(session_id)["status"] == "gameover"

    with direct_vm.expect_revert("Session already ended"):
        contract.take_turn(session_id, "flee")


def test_hp_clamped_to_max_hp(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    direct_vm.mock_llm(_turn_pattern("rest"), _turn_response(hp=9999, gold=0, xp=0))
    contract.take_turn(session_id, "rest")
    session = contract.get_session(session_id)
    assert session["hp"] == session["max_hp"]


def test_gold_never_negative(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    direct_vm.mock_llm(_turn_pattern("gamble"), _turn_response(hp=0, gold=-9999, xp=0))
    contract.take_turn(session_id, "gamble")
    assert contract.get_session(session_id)["gold"] == 0


def test_level_up_pays_reward_from_funded_pool(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.deal(direct_vm._contract_address, 10 * 10**18)

    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    # Level 1 -> 2 needs 50 xp (level * 50).
    direct_vm.mock_llm(_turn_pattern("train"), _turn_response(hp=0, gold=0, xp=60))
    result = contract.take_turn(session_id, "train")

    assert result["leveled_up"] is True
    assert int(result["reward_paid"]) == 5_000_000_000_000_000
    session = contract.get_session(session_id)
    assert session["level"] == 2
    assert session["max_hp"] == 120


def test_level_up_skipped_when_pool_empty(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    # No deal() — contract balance stays 0.
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    direct_vm.mock_llm(_turn_pattern("train"), _turn_response(hp=0, gold=0, xp=60))
    result = contract.take_turn(session_id, "train")

    assert result["leveled_up"] is True
    assert int(result["reward_paid"]) == 0


def test_take_turn_validator_agrees_within_xp_tolerance(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    pattern = _turn_pattern("train")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(pattern, _turn_response(hp=0, gold=5, xp=10))
    contract.take_turn(session_id, "train")

    # Validator independently re-runs leader_fn(); simulate it landing within the
    # tolerance band (xp=15 is within XP_TOLERANCE_RATIO=2.0 of the leader's xp=10).
    direct_vm.clear_mocks()
    direct_vm.mock_llm(pattern, _turn_response(hp=0, gold=5, xp=15))
    assert direct_vm.run_validator() is True


def test_take_turn_validator_disagrees_on_inflated_xp(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    pattern = _turn_pattern("train")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(pattern, _turn_response(hp=0, gold=5, xp=10))
    contract.take_turn(session_id, "train")

    # Simulate the validator's independent leader_fn() call landing on a wildly
    # inflated xp_gain (50x). Before this fix, validator_fn never even looked at
    # xp_gain/gold_change, so this would have been accepted — this is exactly the
    # "payout invariants" / "XP... correctness" gap the steward flagged.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(pattern, _turn_response(hp=0, gold=5, xp=500))
    assert direct_vm.run_validator() is False


def test_take_turn_validator_disagrees_on_opposite_gold_sign(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(START_PATTERN, _start_response())
    session_id = contract.start_session()

    pattern = _turn_pattern("loot")
    direct_vm.clear_mocks()
    direct_vm.mock_llm(pattern, _turn_response(hp=0, gold=20, xp=0))
    contract.take_turn(session_id, "loot")

    direct_vm.clear_mocks()
    direct_vm.mock_llm(pattern, _turn_response(hp=0, gold=-20, xp=0))
    assert direct_vm.run_validator() is False


def test_start_session_validator_disagrees_on_nonzero_xp(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/dungeon_master.py")
    direct_vm.sender = direct_alice

    direct_vm.mock_llm(START_PATTERN, _start_response())
    contract.start_session()

    # Opening scene must report zero mechanical changes on both sides.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(START_PATTERN, _start_response())
    assert direct_vm.run_validator(leader_result={
        "narrative": "You awaken.",
        "hp_change": 0,
        "gold_change": 0,
        "xp_gain": 5,
        "choices": ["Go north"],
    }) is False
