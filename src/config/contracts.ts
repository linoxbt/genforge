import type { Address } from "viem";

/**
 * Addresses of GenForge's intelligent contracts, deployed once to GenLayer Asimov Testnet.
 * Source: /root/Genforge/contracts/*.py — see each contract for its ABI/behavior.
 * Redeploying a contract (contracts/*.py) requires updating its address here.
 */
export const CONTRACTS = {
  bountyBoard: "0x7eF217F1A3a05D9f93cA64DDDB0d2B3B3c661249" as Address,
  predictionMarket: "0xE1acC4AD01609E77235c0D61854589905444A713" as Address,
  triviaRewards: "0x28dA35D4Dc3388805dB23bCDc469707360650acE" as Address,
  dungeonMaster: "0x7ba49B8a80B10EDc84ff6AB04E04B8ffbC92B7Da" as Address,
} as const;
