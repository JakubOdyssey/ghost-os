import { describe, expect, it } from "vitest";

import { evaluateConfirmationSatisfaction } from "../../../../src/ghost/core/policy/confirmation-satisfaction.policy.js";
import type { PolicyDecision } from "../../../../src/ghost/core/policy/policy.types.js";

const policyId = "core.policy.confirmation.satisfaction.v0";

const nullablePolicyDecision: PolicyDecision = {
  decisionId: "decision-unclassified",
  requestId: "request-unclassified",
  outcome: "needs_context",
  contextStatus: "incomplete",
  riskClass: null,
  confirmationLevel: null,
  reasons: [],
  appliedPolicyIds: [],
  evaluatedAt: "2026-07-13T12:00:00.000Z",
  metadata: {},
};

describe("Phase P4.5 confirmation satisfaction", () => {
  it.each([
    ["satisfied", "allowed", "complete"],
    ["missing", "allowed", "complete"],
    ["rejected", "allowed", "complete"],
    ["unknown", "allowed", "complete"],
  ] as const)(
    "maps C0 with %s to %s and %s context",
    (status, expectedOutcome, expectedContextStatus) => {
      const result = evaluateConfirmationSatisfaction({
        requiredLevel: "C0",
        status,
      });

      expect(result.outcome).toBe(expectedOutcome);
      expect(result.contextStatus).toBe(expectedContextStatus);
      expect(result.reason.code).toBe("confirmation_not_required");
    },
  );

  it.each([
    ["satisfied", "allowed", "complete", "confirmation_satisfied"],
    ["missing", "needs_confirmation", "complete", "confirmation_missing"],
    ["rejected", "blocked", "invalid", "confirmation_rejected"],
    [
      "unknown",
      "needs_context",
      "incomplete",
      "confirmation_satisfaction_unknown",
    ],
  ] as const)(
    "maps C1 with %s to %s and %s context",
    (status, expectedOutcome, expectedContextStatus, expectedCode) => {
      const result = evaluateConfirmationSatisfaction({
        requiredLevel: "C1",
        status,
      });

      expect(result.outcome).toBe(expectedOutcome);
      expect(result.contextStatus).toBe(expectedContextStatus);
      expect(result.reason.code).toBe(expectedCode);
    },
  );

  it("applies the same satisfaction mapping to C2", () => {
    expect(
      evaluateConfirmationSatisfaction({
        requiredLevel: "C2",
        status: "missing",
      }).outcome,
    ).toBe("needs_confirmation");
  });

  it("applies the same satisfaction mapping to C3", () => {
    expect(
      evaluateConfirmationSatisfaction({
        requiredLevel: "C3",
        status: "satisfied",
      }).outcome,
    ).toBe("allowed");
  });

  it("returns the stable policy ID and deterministic reason", () => {
    const input = {
      requiredLevel: "C2",
      status: "rejected",
    } as const;
    const first = evaluateConfirmationSatisfaction(input);
    const second = evaluateConfirmationSatisfaction(input);

    expect(first).toEqual({
      outcome: "blocked",
      contextStatus: "invalid",
      policyId,
      reason: {
        policyId,
        code: "confirmation_rejected",
        message:
          "Confirmation satisfaction status for required level C2 is rejected.",
        metadata: {
          requiredLevel: "C2",
          confirmationSatisfactionStatus: "rejected",
        },
      },
    });
    expect(second).toEqual(first);
  });

  it("returns metadata with only resolved satisfaction facts", () => {
    const result = evaluateConfirmationSatisfaction({
      requiredLevel: "C3",
      status: "unknown",
    });

    expect(result.reason.metadata).toEqual({
      requiredLevel: "C3",
      confirmationSatisfactionStatus: "unknown",
    });
    expect(Object.keys(result.reason.metadata)).toEqual([
      "requiredLevel",
      "confirmationSatisfactionStatus",
    ]);
  });

  it("allows unclassified risk and confirmation in PolicyDecision", () => {
    expect(nullablePolicyDecision.riskClass).toBeNull();
    expect(nullablePolicyDecision.confirmationLevel).toBeNull();
  });
});
