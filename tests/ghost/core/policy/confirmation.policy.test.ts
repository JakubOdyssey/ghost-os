import { describe, expect, it } from "vitest";

import { classifyConfirmationRequirement } from "../../../../src/ghost/core/policy/confirmation.policy.js";

const policyId = "core.policy.confirmation.risk-mapping.v0";

describe("Phase P2 confirmation mapping", () => {
  it.each([
    ["R0", "C0"],
    ["R1", "C0"],
    ["R2", "C1"],
    ["R3", "C2"],
    ["R4", "C3"],
  ] as const)(
    "maps %s to minimum confirmation level %s",
    (riskClass, expectedConfirmationLevel) => {
      expect(
        classifyConfirmationRequirement(riskClass).confirmationLevel,
      ).toBe(expectedConfirmationLevel);
    },
  );

  it("returns the stable policy ID and deterministic reason", () => {
    const first = classifyConfirmationRequirement("R3");
    const second = classifyConfirmationRequirement("R3");

    expect(first).toEqual({
      confirmationLevel: "C2",
      policyId,
      reason: {
        policyId,
        code: "confirmation_requirement_classified",
        message: "Risk class R3 requires confirmation level C2.",
        metadata: {
          riskClass: "R3",
          confirmationLevel: "C2",
        },
      },
    });
    expect(second).toEqual(first);
  });

  it("depends only on the supplied risk class", () => {
    expect(classifyConfirmationRequirement.length).toBe(1);
    expect(Object.keys(classifyConfirmationRequirement("R2"))).toEqual([
      "confirmationLevel",
      "policyId",
      "reason",
    ]);
  });
});
