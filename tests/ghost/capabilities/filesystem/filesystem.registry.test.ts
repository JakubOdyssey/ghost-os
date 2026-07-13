import { describe, expect, it } from "vitest";

import {
  FILESYSTEM_OPERATIONS,
  FILESYSTEM_REGISTRY_ENTRY,
  guardFilesystemRegistry,
} from "../../../../src/ghost/capabilities/filesystem/filesystem.registry.js";

describe("filesystem.v0 registry guard", () => {
  it("allows a supported capability and operation", () => {
    expect(guardFilesystemRegistry("filesystem.v0", "search")).toEqual({
      status: "allowed",
      capabilityId: "filesystem.v0",
      operation: "search",
      reason: null,
    });
  });

  it("blocks an unknown capability", () => {
    const result = guardFilesystemRegistry("unknown.v0", "search");

    expect(result.status).toBe("blocked");
    expect(result.capabilityId).toBe("unknown.v0");
    expect(result.reason).toBe("Unknown capability ID: unknown.v0");
  });

  it("blocks an unknown operation", () => {
    const result = guardFilesystemRegistry("filesystem.v0", "delete");

    expect(result.status).toBe("blocked");
    expect(result.operation).toBe("delete");
    expect(result.reason).toBe(
      "Unknown operation for filesystem.v0: delete",
    );
  });

  it("contains the documented status and readiness", () => {
    expect(FILESYSTEM_REGISTRY_ENTRY).toMatchObject({
      capabilityId: "filesystem.v0",
      status: "specified",
      readiness: "adapter_implementation_ready",
      firstAdapter: "GoogleDriveFilesystemAdapter",
    });
  });

  it("registers every documented operation", () => {
    expect(FILESYSTEM_REGISTRY_ENTRY.operations).toEqual([
      "search",
      "create_folder",
      "create_document",
      "copy",
      "rename_file",
      "move_file",
    ]);
    expect(FILESYSTEM_REGISTRY_ENTRY.operations).toBe(FILESYSTEM_OPERATIONS);
  });
});
