import type {
  ConfirmationLevel,
  ConfirmationRequirementResult,
  PolicyId,
  PolicyReason,
  RiskClass,
} from "./policy.types.js";

const CONFIRMATION_REQUIREMENT_POLICY_ID: PolicyId =
  "core.policy.confirmation.risk-mapping.v0";

const CONFIRMATION_LEVEL_BY_RISK: Readonly<
  Record<RiskClass, ConfirmationLevel>
> = {
  R0: "C0",
  R1: "C0",
  R2: "C1",
  R3: "C2",
  R4: "C3",
};

function createConfirmationReason(
  riskClass: RiskClass,
  confirmationLevel: ConfirmationLevel,
): PolicyReason {
  return {
    policyId: CONFIRMATION_REQUIREMENT_POLICY_ID,
    code: "confirmation_requirement_classified",
    message: `Risk class ${riskClass} requires confirmation level ${confirmationLevel}.`,
    metadata: {
      riskClass,
      confirmationLevel,
    },
  };
}

export function classifyConfirmationRequirement(
  riskClass: RiskClass,
): ConfirmationRequirementResult {
  const confirmationLevel = CONFIRMATION_LEVEL_BY_RISK[riskClass];

  return {
    confirmationLevel,
    policyId: CONFIRMATION_REQUIREMENT_POLICY_ID,
    reason: createConfirmationReason(riskClass, confirmationLevel),
  };
}
