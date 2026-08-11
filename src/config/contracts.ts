import type { Address } from "viem";

/**
 * Addresses of GenForge's intelligent contracts, deployed once to GenLayer Asimov Testnet.
 * Source: /root/Genforge/contracts/*.py, see each contract for its ABI/behavior.
 * Redeploying a contract (contracts/*.py) requires updating its address here.
 */
export const CONTRACTS = {
  bountyBoard: "0x206337af5D7dCD295D0D94D96A2c49a6ecF4b5F1" as Address,
  predictionMarket: "0xa22450cdd7944B22CA0DA770b516a086CC009ecC" as Address,
  triviaRewards: "0x2C176f4E2f578084fAE5337FBa3ab5905FdA6A30" as Address,
  dungeonMaster: "0x958808F92fFD96E1B41935B30e60505538210991" as Address,
} as const;
