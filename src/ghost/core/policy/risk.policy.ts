import type {
  PolicyId,
  PolicyReason,
  RiskClass,
  RiskClassificationResult,
} from "./policy.types.js";

const OPERATION_CLASSIFICATION_POLICY_ID: PolicyId =
  "core.policy.risk.operation-classification.v0";

const FILESYSTEM_V0_BASE_RISK: Readonly<Record<string, RiskClass>> = {
  search: "R0",
  create_folder: "R1",
  create_document: "R1",
  copy: "R1",
  rename_file: "R2",
  move_file: "R2",
};

function createClassificationReason(
  capabilityId: string,
  operation: string,
  riskClass: RiskClass,
): PolicyReason {
  return {
    policyId: OPERATION_CLASSIFICATION_POLICY_ID,
    code: "base_risk_classified",
    message: `Base risk for ${capabilityId}:${operation} is ${riskClass}.`,
    metadata: {
      capabilityId,
      operation,
      riskClass,
    },
  };
}

export function classifyBaseRisk(
  capabilityId: string,
  operation: string,
): RiskClassificationResult | null {
  if (capabilityId !== "filesystem.v0") {
    return null;
  }

  const riskClass = FILESYSTEM_V0_BASE_RISK[operation];

  if (riskClass === undefined) {
    return null;
  }

  return {
    riskClass,
    policyId: OPERATION_CLASSIFICATION_POLICY_ID,
    reason: createClassificationReason(capabilityId, operation, riskClass),
  };
}
