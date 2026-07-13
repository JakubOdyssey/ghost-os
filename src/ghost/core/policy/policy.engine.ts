import { evaluateConfirmationSatisfaction } from "./confirmation-satisfaction.policy.js";
import { classifyConfirmationRequirement } from "./confirmation.policy.js";
import { evaluatePermissionPolicy } from "./permission.policy.js";
import { classifyBaseRisk } from "./risk.policy.js";
import type {
  PolicyContextStatus,
  PolicyDecision,
  PolicyEngineInput,
  PolicyId,
  PolicyOutcome,
  PolicyReason,
} from "./policy.types.js";
import { evaluateWorkspacePolicy } from "./workspace.policy.js";

const POLICY_ENGINE_ID: PolicyId = "core.policy.engine.composition.v0";

function composeOutcome(outcomes: readonly PolicyOutcome[]): PolicyOutcome {
  if (outcomes.includes("blocked")) {
    return "blocked";
  }

  if (outcomes.includes("needs_context")) {
    return "needs_context";
  }

  if (outcomes.includes("needs_confirmation")) {
    return "needs_confirmation";
  }

  return "allowed";
}

function contextStatusForOutcome(
  outcome: PolicyOutcome,
): PolicyContextStatus {
  if (outcome === "blocked") {
    return "invalid";
  }

  if (outcome === "needs_context") {
    return "incomplete";
  }

  return "complete";
}

function createUnsupportedReason(input: PolicyEngineInput): PolicyReason {
  return {
    policyId: POLICY_ENGINE_ID,
    code: "unsupported_policy_request",
    message:
      "The capability or operation is not supported by the current Policy Engine classification.",
    metadata: {
      capabilityId: input.capabilityId,
      operation: input.operation,
    },
  };
}

function createCompositionReason(
  outcome: PolicyOutcome,
  contextStatus: PolicyContextStatus,
): PolicyReason {
  return {
    policyId: POLICY_ENGINE_ID,
    code: "policy_decision_composed",
    message: `Policy decision composed as ${outcome} with ${contextStatus} context.`,
    metadata: {
      finalOutcome: outcome,
      finalContextStatus: contextStatus,
    },
  };
}

function collectAppliedPolicyIds(
  reasons: readonly PolicyReason[],
): readonly PolicyId[] {
  const seen = new Set<PolicyId>();
  const policyIds: PolicyId[] = [];

  for (const reason of reasons) {
    if (!seen.has(reason.policyId)) {
      seen.add(reason.policyId);
      policyIds.push(reason.policyId);
    }
  }

  return policyIds;
}

export function evaluatePolicy(input: PolicyEngineInput): PolicyDecision {
  const riskClassification = classifyBaseRisk(
    input.capabilityId,
    input.operation,
  );
  const workspaceResult = evaluateWorkspacePolicy(input.workspace);
  const permissionResult = evaluatePermissionPolicy(input.permission);

  let riskClass: PolicyDecision["riskClass"] = null;
  let confirmationLevel: PolicyDecision["confirmationLevel"] = null;
  let reasons: readonly PolicyReason[];
  let outcome: PolicyOutcome;

  if (riskClassification === null) {
    outcome = "blocked";
    reasons = [
      createUnsupportedReason(input),
      workspaceResult.reason,
      permissionResult.reason,
    ];
  } else {
    const confirmationRequirement = classifyConfirmationRequirement(
      riskClassification.riskClass,
    );
    const confirmationSatisfaction = evaluateConfirmationSatisfaction({
      requiredLevel: confirmationRequirement.confirmationLevel,
      status: input.confirmationSatisfactionStatus,
    });

    riskClass = riskClassification.riskClass;
    confirmationLevel = confirmationRequirement.confirmationLevel;
    outcome = composeOutcome([
      workspaceResult.outcome,
      permissionResult.outcome,
      confirmationSatisfaction.outcome,
    ]);
    reasons = [
      riskClassification.reason,
      confirmationRequirement.reason,
      workspaceResult.reason,
      permissionResult.reason,
      confirmationSatisfaction.reason,
    ];
  }

  const contextStatus = contextStatusForOutcome(outcome);
  const orderedReasons = [
    ...reasons,
    createCompositionReason(outcome, contextStatus),
  ];

  return {
    decisionId: input.decisionId,
    requestId: input.requestId,
    outcome,
    contextStatus,
    riskClass,
    confirmationLevel,
    reasons: orderedReasons,
    appliedPolicyIds: collectAppliedPolicyIds(orderedReasons),
    evaluatedAt: input.evaluatedAt,
    metadata: {},
  };
}
