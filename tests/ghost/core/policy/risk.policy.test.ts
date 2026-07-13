import { describe, expect, it } from "vitest";

import { classifyBaseRisk } from "../../../../src/ghost/core/policy/risk.policy.js";

const policyId = "core.policy.risk.operation-classification.v0";

describe("Phase P1 operation classification", () => {
  it.each([
    ["search", "R0"],
    ["create_folder", "R1"],
    ["create_document", "R1"],
    ["copy", "R1"],
    ["rename_file", "R2"],
    ["move_file", "R2"],
  ] as const)("classifies %s as %s", (operation, expectedRiskClass) => {
    expect(classifyBaseRisk("filesystem.v0", operation)?.riskClass).toBe(
      expectedRiskClass,
    );
  });

  it("classifies copy as R1", () => {
    expect(classifyBaseRisk("filesystem.v0", "copy")?.riskClass).toBe("R1");
  });

  it("returns null for an unknown capability", () => {
    expect(classifyBaseRisk("unknown.v0", "search")).toBeNull();
  });

  it("returns null for an unsupported operation", () => {
    expect(classifyBaseRisk("filesystem.v0", "delete")).toBeNull();
  });

  it("returns the stable policy ID and deterministic reason", () => {
    const first = classifyBaseRisk("filesystem.v0", "rename_file");
    const second = classifyBaseRisk("filesystem.v0", "rename_file");

    expect(first).toEqual({
      riskClass: "R2",
      policyId,
      reason: {
        policyId,
        code: "base_risk_classified",
        message: "Base risk for filesystem.v0:rename_file is R2.",
        metadata: {
          capabilityId: "filesystem.v0",
          operation: "rename_file",
          riskClass: "R2",
        },
      },
    });
    expect(second).toEqual(first);
  });
});
