import { describe, expect, it } from "vitest";

import type {
  ConfirmationLevel,
  FilesystemExecutionRecord,
  FilesystemOperation,
  FilesystemRequest,
  FilesystemResponse,
  RiskClass,
} from "../../../../src/ghost/capabilities/filesystem/filesystem.types.js";

const supportedOperations = [
  "search",
  "create_folder",
  "create_document",
  "copy",
  "rename_file",
  "move_file",
] as const satisfies readonly FilesystemOperation[];

const riskClass: RiskClass = "R1";
const confirmationLevel: ConfirmationLevel = "C0";

const validRequest: FilesystemRequest = {
  requestId: "request-001",
  actor: "actor-001",
  capabilityId: "filesystem.v0",
  operation: "create_document",
  workspace: {
    workspaceId: "workspace-001",
    displayName: "Example workspace",
  },
  target: {
    parentResourceId: "folder-001",
    name: "example-document",
  },
  input: {
    content: "Example content",
  },
  requestedAt: "2026-07-12T12:00:00.000Z",
  confirmationStatus: "not_required",
  memoryHint: "ignore",
};

const validExecutionRecord: FilesystemExecutionRecord = {
  executionId: "execution-001",
  requestId: validRequest.requestId,
  actor: validRequest.actor,
  capabilityId: validRequest.capabilityId,
  operation: validRequest.operation,
  workspaceId: validRequest.workspace.workspaceId,
  status: "success",
  verificationStatus: "verified",
  confirmationStatus: "not_required",
  riskClass,
  confirmationLevel,
  memoryHint: validRequest.memoryHint,
  startedAt: validRequest.requestedAt,
  completedAt: "2026-07-12T12:00:01.000Z",
};

const validResponse: FilesystemResponse = {
  requestId: validRequest.requestId,
  capabilityId: validRequest.capabilityId,
  operation: validRequest.operation,
  status: "success",
  resourceId: "document-001",
  resourceUrl: null,
  verificationStatus: "verified",
  verificationSummary: "The document result matched the requested operation.",
  errorSummary: null,
  confirmationStatus: "not_required",
  executionRecord: validExecutionRecord,
  memoryHint: validRequest.memoryHint,
  completedAt: validExecutionRecord.completedAt,
};

describe("filesystem.v0 type contracts", () => {
  it("accepts every supported filesystem operation", () => {
    expect(supportedOperations).toEqual([
      "search",
      "create_folder",
      "create_document",
      "copy",
      "rename_file",
      "move_file",
    ]);
  });

  it("rejects an unsupported operation during typechecking", () => {
    // @ts-expect-error Unsupported operations must not satisfy the contract.
    const unsupportedOperation: FilesystemOperation = "delete";
  });

  it("accepts valid required request, response, and execution record data", () => {
    expect(validRequest.capabilityId).toBe("filesystem.v0");
    expect(validResponse.requestId).toBe(validRequest.requestId);
    expect(validResponse.executionRecord.riskClass).toBe("R1");
  });
});
