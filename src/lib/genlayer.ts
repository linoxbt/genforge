import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

// Read-only client: no wallet/account required, used for view calls regardless of connection state.
export const readClient = createClient({ chain: testnetAsimov });

// Wait target for writes: reached once consensus has executed the transaction
// (fast); FINALIZED is a later, slower stage we don't need for UI purposes.
export const WAIT_STATUS = TransactionStatus.ACCEPTED;

export function isExecutionSuccess(receipt: any): boolean {
  return receipt?.txExecutionResultName === "FINISHED_WITH_RETURN";
}

export function executionErrorMessage(receipt: any): string {
  return (
    receipt?.txDataDecoded?.error ??
    receipt?.txExecutionResultName ??
    "Transaction execution failed"
  );
}
