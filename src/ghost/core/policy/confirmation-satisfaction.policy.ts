import type {
  ConfirmationSatisfactionInput,
  ConfirmationSatisfactionResult,
  ConfirmationSatisfactionStatus,
  PolicyContextStatus,
  PolicyId,
  PolicyOutcome,
  PolicyReason,
} from "./policy.types.js";

const CONFIRMATION_SATISFACTION_POLICY_ID: PolicyId =
  "core.policy.confirmation.satisfaction.v0";

interface ConfirmationSatisfactionDecision {
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly code: string;
}

const DECISION_BY_SATISFACTION_STATUS: Readonly<
  Record<ConfirmationSatisfactionStatus, ConfirmationSatisfactionDecision>
> = {
  satisfied: {
    outcome: "allowed",
    contextStatus: "complete",
    code: "confirmation_satisfied",
  },
  missing: {
    outcome: "needs_confirmation",
    contextStatus: "complete",
    code: "confirmation_missing",
  },
  rejected: {
    outcome: "blocked",
    contextStatus: "invalid",
    code: "confirmation_rejected",
  },
  unknown: {
    outcome: "needs_context",
    contextStatus: "incomplete",
    code: "confirmation_satisfaction_unknown",
  },
};

const CONFIRMATION_NOT_REQUIRED_DECISION: ConfirmationSatisfactionDecision = {
  outcome: "allowed",
  contextStatus: "complete",
  code: "confirmation_not_required",
};

function createSatisfactionReason(
  input: ConfirmationSatisfactionInput,
  decision: ConfirmationSatisfactionDecision,
): PolicyReason {
  const message =
    input.requiredLevel === "C0"
      ? "Confirmation level C0 does not require confirmation."
      : `Confirmation satisfaction status for required level ${input.requiredLevel} is ${input.status}.`;

  return {
    policyId: CONFIRMATION_SATISFACTION_POLICY_ID,
    code: decision.code,
    message,
    metadata: {
      requiredLevel: input.requiredLevel,
      confirmationSatisfactionStatus: input.status,
    },
  };
}

export function evaluateConfirmationSatisfaction(
  input: ConfirmationSatisfactionInput,
): ConfirmationSatisfactionResult {
  const decision =
    input.requiredLevel === "C0"
      ? CONFIRMATION_NOT_REQUIRED_DECISION
      : DECISION_BY_SATISFACTION_STATUS[input.status];

  return {
    outcome: decision.outcome,
    contextStatus: decision.contextStatus,
    policyId: CONFIRMATION_SATISFACTION_POLICY_ID,
    reason: createSatisfactionReason(input, decision),
  };
}
