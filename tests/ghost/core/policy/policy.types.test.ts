import { describe, expect, it } from "vitest";

import type {
  ConfirmationLevel,
  PolicyContextStatus,
  PolicyDecision,
  PolicyEvaluationInput,
  PolicyOutcome,
  RiskClass,
} from "../../../../src/ghost/core/policy/policy.types.js";

const policyOutcomes = [
  "allowed",
  "blocked",
  "needs_confirmation",
  "needs_context",
] as const satisfies readonly PolicyOutcome[];

const contextStatuses = [
  "complete",
  "incomplete",
  "invalid",
] as const satisfies readonly PolicyContextStatus[];

const riskClass: RiskClass = "R1";
const confirmationLevel: ConfirmationLevel = "C0";

const validInput: PolicyEvaluationInput = {
  requestId: "request-001",
  actor: "actor-001",
  capabilityId: "example.capability.v0",
  operation: "example_operation",
  workspaceId: "workspace-001",
  targetId: null,
  targetName: "example-target",
  input: {
    example: true,
  },
  requestedAt: "2026-07-12T12:00:00.000Z",
  confirmationStatus: "not_required",
  metadata: {},
};

const validDecision: PolicyDecision = {
  decisionId: "decision-001",
  requestId: validInput.requestId,
  outcome: "allowed",
  contextStatus: "complete",
  riskClass,
  confirmationLevel,
  reasons: [],
  appliedPolicyIds: ["example.policy"],
  evaluatedAt: "2026-07-12T12:00:00.100Z",
  metadata: {},
};

describe("Policy Engine Phase P0 contracts", () => {
  it("accepts every policy outcome", () => {
    expect(policyOutcomes).toEqual([
      "allowed",
      "blocked",
      "needs_confirmation",
      "needs_context",
    ]);
  });

  it("accepts every policy context status", () => {
    expect(contextStatuses).toEqual(["complete", "incomplete", "invalid"]);
  });

  it("accepts capability-independent input and a valid decision", () => {
    expect(validInput.capabilityId).toBe("example.capability.v0");
    expect(validDecision.riskClass).toBe("R1");
    expect(validDecision.confirmationLevel).toBe("C0");
  });

  it("rejects an unsupported policy outcome during typechecking", () => {
    // @ts-expect-error Unsupported outcomes must not satisfy the contract.
    const unsupportedOutcome: PolicyOutcome = "approved";
  });
});
