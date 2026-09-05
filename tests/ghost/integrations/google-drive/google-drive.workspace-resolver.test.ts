import { describe, expect, it } from "vitest";

import {
  ConfiguredGoogleDriveWorkspaceResolver,
  type GoogleDriveWorkspaceConfiguration,
  type GoogleDriveWorkspaceConfigurationSource,
} from "../../../../src/ghost/integrations/google-drive/workspace/google-drive.workspace-resolver.js";

const secretSentinel = "TEST_SECRET_SENTINEL";

class FakeWorkspaceConfigurationSource
  implements GoogleDriveWorkspaceConfigurationSource
{
  public readonly workspaceIds: string[] = [];
  public thrownError: unknown = null;

  public constructor(
    private readonly configurations: ReadonlyMap<
      string,
      GoogleDriveWorkspaceConfiguration
    >,
  ) {}

  public find(
    workspaceId: string,
  ): Promise<GoogleDriveWorkspaceConfiguration | null> {
    this.workspaceIds.push(workspaceId);
    if (this.thrownError !== null) return Promise.reject(this.thrownError);
    return Promise.resolve(this.configurations.get(workspaceId) ?? null);
  }
}

describe("A3 GoogleDriveWorkspaceResolver", () => {
  it("returns exact approved provider context for a configured logical workspace", async () => {
    const source = configuredSource();
    const result = await new ConfiguredGoogleDriveWorkspaceResolver(
      source,
    ).resolve("logical-workspace-a");

    expect(result).toEqual({
      status: "approved",
      workspaceId: "logical-workspace-a",
      code: "google_drive_workspace_approved",
      message: "Google Drive workspace mapping is approved.",
      provider: "google_drive",
      driveId: "fake-drive-a",
      rootFolderId: "fake-root-a",
      metadata: { source: "test_configuration" },
    });
    expect(source.workspaceIds).toEqual(["logical-workspace-a"]);
    if (result.status === "approved") {
      expect(result.workspaceId).not.toBe(result.driveId);
    }
  });

  it("returns restricted without executable provider context", async () => {
    const result = await new ConfiguredGoogleDriveWorkspaceResolver(
      configuredSource(),
    ).resolve("logical-workspace-restricted");

    expect(result).toEqual({
      status: "restricted",
      workspaceId: "logical-workspace-restricted",
      code: "google_drive_workspace_restricted",
      message: "Google Drive workspace mapping is restricted.",
      metadata: { source: "test_configuration" },
    });
    expect(result).not.toHaveProperty("driveId");
    expect(result).not.toHaveProperty("rootFolderId");
    expect(result).not.toHaveProperty("provider");
  });

  it("returns unknown without executable provider context", async () => {
    const result = await new ConfiguredGoogleDriveWorkspaceResolver(
      configuredSource(),
    ).resolve("logical-workspace-unknown");

    expect(result).toEqual({
      status: "unknown",
      workspaceId: "logical-workspace-unknown",
      code: "google_drive_workspace_unknown",
      message: "Google Drive workspace mapping is unknown.",
      metadata: {},
    });
    expect(result).not.toHaveProperty("driveId");
    expect(result).not.toHaveProperty("rootFolderId");
    expect(result).not.toHaveProperty("provider");
  });

  it("rejects a mismatched provider mapping instead of treating workspaceId as driveId", async () => {
    const source = new FakeWorkspaceConfigurationSource(
      new Map([
        [
          "logical-workspace-a",
          {
            status: "approved",
            workspaceId: "different-logical-workspace",
            driveId: "logical-workspace-a",
            rootFolderId: "fake-root-a",
            metadata: {},
          } satisfies GoogleDriveWorkspaceConfiguration,
        ],
      ]),
    );
    const result = await new ConfiguredGoogleDriveWorkspaceResolver(
      source,
    ).resolve("logical-workspace-a");

    expect(result.status).toBe("unknown");
    expect(result).not.toHaveProperty("driveId");
  });

  it("converts a configuration source failure into a safe unknown result", async () => {
    const source = configuredSource();
    source.thrownError = new Error(secretSentinel);
    const result = await new ConfiguredGoogleDriveWorkspaceResolver(
      source,
    ).resolve("logical-workspace-a");

    expect(result.status).toBe("unknown");
    expect(source.workspaceIds).toEqual(["logical-workspace-a"]);
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
  });

  it("preserves logical IDs and returns deterministic public results", async () => {
    const first = await new ConfiguredGoogleDriveWorkspaceResolver(
      configuredSource(),
    ).resolve("logical-workspace-a");
    const second = await new ConfiguredGoogleDriveWorkspaceResolver(
      configuredSource(),
    ).resolve("logical-workspace-a");

    expect(second).toEqual(first);
    expect(first.workspaceId).toBe("logical-workspace-a");
  });

  it("never carries authorization state or credentials into workspace results", async () => {
    const result = await new ConfiguredGoogleDriveWorkspaceResolver(
      configuredSource(),
    ).resolve("logical-workspace-a");
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(secretSentinel);
    expect(serialized).not.toMatch(
      /authorizationState|credentials|accessToken|refreshToken|clientSecret/i,
    );
  });
});

function configuredSource(): FakeWorkspaceConfigurationSource {
  return new FakeWorkspaceConfigurationSource(
    new Map<string, GoogleDriveWorkspaceConfiguration>([
      [
        "logical-workspace-a",
        {
          status: "approved",
          workspaceId: "logical-workspace-a",
          driveId: "fake-drive-a",
          rootFolderId: "fake-root-a",
          metadata: { source: "test_configuration" },
        },
      ],
      [
        "logical-workspace-restricted",
        {
          status: "restricted",
          workspaceId: "logical-workspace-restricted",
          metadata: { source: "test_configuration" },
        },
      ],
    ]),
  );
}
