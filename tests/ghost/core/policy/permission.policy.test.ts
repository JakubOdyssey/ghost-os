import { describe, expect, it } from "vitest";

import { evaluatePermissionPolicy } from "../../../../src/ghost/core/policy/permission.policy.js";

const policyId = "core.policy.permission.actor-authorization.v0";

describe("Phase P4 actor scope boundary", () => {
  it.each([
    ["authorized", "allowed", "complete", "actor_authorized"],
    ["unauthorized", "blocked", "invalid", "actor_unauthorized"],
    [
      "unknown",
      "needs_context",
      "incomplete",
      "actor_authorization_unknown",
    ],
  ] as const)(
    "maps %s to %s with %s context",
    (status, expectedOutcome, expectedContextStatus, expectedCode) => {
      const result = evaluatePermissionPolicy({
        actorId: "actor-001",
        status,
      });

      expect(result.outcome).toBe(expectedOutcome);
      expect(result.contextStatus).toBe(expectedContextStatus);
      expect(result.reason.code).toBe(expectedCode);
    },
  );

  it("returns the stable policy ID and deterministic reason", () => {
    const input = {
      actorId: "actor-001",
      status: "unauthorized",
    } as const;
    const first = evaluatePermissionPolicy(input);
    const second = evaluatePermissionPolicy(input);

    expect(first).toEqual({
      outcome: "blocked",
      contextStatus: "invalid",
      policyId,
      reason: {
        policyId,
        code: "actor_unauthorized",
        message: "The resolved actor is unauthorized.",
        metadata: {
          actorId: "actor-001",
          actorAuthorizationStatus: "unauthorized",
        },
      },
    });
    expect(second).toEqual(first);
  });

  it("preserves actor ID without provider, workspace, or role context", () => {
    const result = evaluatePermissionPolicy({
      actorId: "logical-actor",
      status: "authorized",
    });

    expect(result.reason.metadata).toEqual({
      actorId: "logical-actor",
      actorAuthorizationStatus: "authorized",
    });
    expect(Object.keys(result.reason.metadata)).toEqual([
      "actorId",
      "actorAuthorizationStatus",
    ]);
    expect(evaluatePermissionPolicy.length).toBe(1);
  });
});
