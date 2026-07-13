import { describe, expect, it } from "vitest";

import { evaluateWorkspacePolicy } from "../../../../src/ghost/core/policy/workspace.policy.js";

const policyId = "core.policy.workspace.status.v0";

describe("Phase P3 workspace context", () => {
  it.each([
    ["approved", "allowed", "complete", "workspace_approved"],
    ["restricted", "blocked", "invalid", "workspace_restricted"],
    ["unknown", "needs_context", "incomplete", "workspace_unknown"],
  ] as const)(
    "maps %s to %s with %s context",
    (status, expectedOutcome, expectedContextStatus, expectedCode) => {
      const result = evaluateWorkspacePolicy({
        workspaceId: "workspace-001",
        status,
      });

      expect(result.outcome).toBe(expectedOutcome);
      expect(result.contextStatus).toBe(expectedContextStatus);
      expect(result.reason.code).toBe(expectedCode);
    },
  );

  it("returns the stable policy ID and deterministic reason", () => {
    const input = {
      workspaceId: "workspace-001",
      status: "restricted",
    } as const;
    const first = evaluateWorkspacePolicy(input);
    const second = evaluateWorkspacePolicy(input);

    expect(first).toEqual({
      outcome: "blocked",
      contextStatus: "invalid",
      policyId,
      reason: {
        policyId,
        code: "workspace_restricted",
        message: "The resolved workspace is restricted.",
        metadata: {
          workspaceId: "workspace-001",
          workspaceStatus: "restricted",
        },
      },
    });
    expect(second).toEqual(first);
  });

  it("preserves workspace ID without provider or adapter context", () => {
    const result = evaluateWorkspacePolicy({
      workspaceId: "logical-workspace",
      status: "approved",
    });

    expect(result.reason.metadata).toEqual({
      workspaceId: "logical-workspace",
      workspaceStatus: "approved",
    });
    expect(evaluateWorkspacePolicy.length).toBe(1);
  });
});
