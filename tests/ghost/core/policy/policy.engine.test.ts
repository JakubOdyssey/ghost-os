import { describe, expect, it } from "vitest";

import { evaluatePolicy } from "../../../../src/ghost/core/policy/policy.engine.js";
import type { PolicyEngineInput } from "../../../../src/ghost/core/policy/policy.types.js";

const baseInput: PolicyEngineInput = {
  decisionId: "decision-001",
  evaluatedAt: "2026-07-13T16:00:00.000Z",
  requestId: "request-001",
  capabilityId: "filesystem.v0",
  operation: "search",
  workspace: {
    workspaceId: "workspace-001",
    status: "approved",
  },
  permission: {
    actorId: "actor-001",
    status: "authorized",
  },
  confirmationSatisfactionStatus: "satisfied",
};

function evaluate(overrides: Partial<PolicyEngineInput> = {}) {
  return evaluatePolicy({ ...baseInput, ...overrides });
}

describe("Phase P5 Policy Engine composition", () => {
  it("allows search with approved workspace and authorized actor", () => {
    expect(evaluate()).toMatchObject({
      outcome: "allowed",
      contextStatus: "complete",
      riskClass: "R0",
      confirmationLevel: "C0",
    });
  });

  it("allows create_document as R1 C0", () => {
    expect(evaluate({ operation: "create_document" })).toMatchObject({
      outcome: "allowed",
      riskClass: "R1",
      confirmationLevel: "C0",
    });
  });

  it("requires confirmation for move_file with missing satisfaction", () => {
    expect(
      evaluate({
        operation: "move_file",
        confirmationSatisfactionStatus: "missing",
      }),
    ).toMatchObject({
      outcome: "needs_confirmation",
      contextStatus: "complete",
      riskClass: "R2",
      confirmationLevel: "C1",
    });
  });

  it("allows move_file with satisfied confirmation", () => {
    expect(evaluate({ operation: "move_file" })).toMatchObject({
      outcome: "allowed",
      riskClass: "R2",
      confirmationLevel: "C1",
    });
  });

  it("blocks rejected confirmation", () => {
    expect(
      evaluate({
        operation: "move_file",
        confirmationSatisfactionStatus: "rejected",
      }),
    ).toMatchObject({ outcome: "blocked", contextStatus: "invalid" });
  });

  it("needs context for an unknown workspace", () => {
    expect(
      evaluate({
        workspace: { workspaceId: "workspace-001", status: "unknown" },
      }),
    ).toMatchObject({ outcome: "needs_context", contextStatus: "incomplete" });
  });

  it("blocks a restricted workspace", () => {
    expect(
      evaluate({
        workspace: { workspaceId: "workspace-001", status: "restricted" },
      }),
    ).toMatchObject({ outcome: "blocked", contextStatus: "invalid" });
  });

  it("blocks an unauthorized actor", () => {
    expect(
      evaluate({
        permission: { actorId: "actor-001", status: "unauthorized" },
      }),
    ).toMatchObject({ outcome: "blocked", contextStatus: "invalid" });
  });

  it("needs context for an unknown actor", () => {
    expect(
      evaluate({
        permission: { actorId: "actor-001", status: "unknown" },
      }),
    ).toMatchObject({ outcome: "needs_context", contextStatus: "incomplete" });
  });

  it("blocks an unsupported operation without classifying risk", () => {
    expect(evaluate({ operation: "delete" })).toMatchObject({
      outcome: "blocked",
      contextStatus: "invalid",
      riskClass: null,
      confirmationLevel: null,
    });
  });

  it("blocks an unsupported capability without classifying risk", () => {
    expect(evaluate({ capabilityId: "unknown.v0" })).toMatchObject({
      outcome: "blocked",
      contextStatus: "invalid",
      riskClass: null,
      confirmationLevel: null,
    });
  });

  it("gives blocked precedence over needs_context", () => {
    expect(
      evaluate({
        workspace: { workspaceId: "workspace-001", status: "restricted" },
        permission: { actorId: "actor-001", status: "unknown" },
      }).outcome,
    ).toBe("blocked");
  });

  it("gives blocked precedence over needs_confirmation", () => {
    expect(
      evaluate({
        operation: "move_file",
        permission: { actorId: "actor-001", status: "unauthorized" },
        confirmationSatisfactionStatus: "missing",
      }).outcome,
    ).toBe("blocked");
  });

  it("gives needs_context precedence over needs_confirmation", () => {
    expect(
      evaluate({
        operation: "move_file",
        workspace: { workspaceId: "workspace-001", status: "unknown" },
        confirmationSatisfactionStatus: "missing",
      }).outcome,
    ).toBe("needs_context");
  });

  it("preserves the required reason order for a supported request", () => {
    expect(evaluate({ operation: "move_file" }).reasons.map(({ code }) => code))
      .toEqual([
        "base_risk_classified",
        "confirmation_requirement_classified",
        "workspace_approved",
        "actor_authorized",
        "confirmation_satisfied",
        "policy_decision_composed",
      ]);
  });

  it("creates unique policy IDs in first-reason order", () => {
    expect(evaluate({ operation: "move_file" }).appliedPolicyIds).toEqual([
      "core.policy.risk.operation-classification.v0",
      "core.policy.confirmation.risk-mapping.v0",
      "core.policy.workspace.status.v0",
      "core.policy.permission.actor-authorization.v0",
      "core.policy.confirmation.satisfaction.v0",
      "core.policy.engine.composition.v0",
    ]);
  });

  it("returns an identical result for identical input", () => {
    expect(evaluate()).toEqual(evaluate());
  });

  it("copies decisionId and evaluatedAt exactly", () => {
    const result = evaluate({
      decisionId: "decision-exact",
      evaluatedAt: "2030-01-02T03:04:05.000Z",
    });

    expect(result.decisionId).toBe("decision-exact");
    expect(result.evaluatedAt).toBe("2030-01-02T03:04:05.000Z");
  });

  it("omits confirmation reasons for unsupported requests", () => {
    const result = evaluate({ operation: "delete" });

    expect(result.reasons.map(({ code }) => code)).toEqual([
      "unsupported_policy_request",
      "workspace_approved",
      "actor_authorized",
      "policy_decision_composed",
    ]);
    expect(result.appliedPolicyIds).toEqual([
      "core.policy.engine.composition.v0",
      "core.policy.workspace.status.v0",
      "core.policy.permission.actor-authorization.v0",
    ]);
  });
});
