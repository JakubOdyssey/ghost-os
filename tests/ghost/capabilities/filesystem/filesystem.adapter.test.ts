import { describe, expect, it } from "vitest";

import type {
  FilesystemAdapter,
  FilesystemAdapterCommand,
  FilesystemAdapterErrorCategory,
  FilesystemAdapterExecutedResult,
  FilesystemAdapterExecutionResult,
  FilesystemResourceEvidence,
} from "../../../../src/ghost/capabilities/filesystem/filesystem.adapter.js";

const commands = [
  {
    executionId: "execution-search",
    requestId: "request-search",
    workspaceId: "workspace-001",
    operation: "search",
    query: "quarterly plan",
    resourceKind: "document",
  },
  {
    executionId: "execution-folder",
    requestId: "request-folder",
    workspaceId: "workspace-001",
    operation: "create_folder",
    parentId: "parent-001",
    name: "Plans",
  },
  {
    executionId: "execution-document",
    requestId: "request-document",
    workspaceId: "workspace-001",
    operation: "create_document",
    parentId: "parent-001",
    title: "Plan",
    content: "Provider-neutral content",
  },
  {
    executionId: "execution-copy",
    requestId: "request-copy",
    workspaceId: "workspace-001",
    operation: "copy",
    sourceId: "source-001",
    destinationParentId: "parent-002",
    newName: "Plan copy",
  },
  {
    executionId: "execution-rename",
    requestId: "request-rename",
    workspaceId: "workspace-001",
    operation: "rename_file",
    targetId: "target-001",
    newName: "Renamed plan",
  },
  {
    executionId: "execution-move",
    requestId: "request-move",
    workspaceId: "workspace-001",
    operation: "move_file",
    targetId: "target-001",
    sourceParentId: "parent-001",
    destinationParentId: "parent-002",
  },
] as const satisfies readonly FilesystemAdapterCommand[];

const resource: FilesystemResourceEvidence = {
  resourceId: "resource-001",
  name: "Plan",
  resourceKind: "document",
  parentIds: ["parent-001"],
  resourceUrl: null,
  metadata: {
    opaqueRevision: "revision-001",
  },
};

const executedResults: readonly FilesystemAdapterExecutedResult[] = [
  {
    status: "executed",
    executionId: "execution-search",
    requestId: "request-search",
    operation: "search",
    evidence: { candidates: [resource] },
    providerMetadata: {},
  },
  {
    status: "executed",
    executionId: "execution-folder",
    requestId: "request-folder",
    operation: "create_folder",
    evidence: { resource: { ...resource, resourceKind: "folder" } },
    providerMetadata: {},
  },
  {
    status: "executed",
    executionId: "execution-document",
    requestId: "request-document",
    operation: "create_document",
    evidence: { resource },
    providerMetadata: {},
  },
  {
    status: "executed",
    executionId: "execution-copy",
    requestId: "request-copy",
    operation: "copy",
    evidence: { resource, sourceResourceId: "source-001" },
    providerMetadata: {},
  },
  {
    status: "executed",
    executionId: "execution-rename",
    requestId: "request-rename",
    operation: "rename_file",
    evidence: { resource, previousName: "Old plan" },
    providerMetadata: {},
  },
  {
    status: "executed",
    executionId: "execution-move",
    requestId: "request-move",
    operation: "move_file",
    evidence: {
      resource,
      previousParentIds: ["parent-001"],
      destinationParentId: "parent-002",
    },
    providerMetadata: {},
  },
];

class DeterministicFakeAdapter implements FilesystemAdapter {
  async execute(
    command: FilesystemAdapterCommand,
  ): Promise<FilesystemAdapterExecutionResult> {
    return Promise.resolve({
      status: "failed",
      executionId: command.executionId,
      requestId: command.requestId,
      operation: command.operation,
      category: "unsupported",
      message: "The deterministic fake does not execute commands.",
      retryable: false,
      providerMetadata: {},
    });
  }
}

describe("Phase A1 filesystem adapter interface", () => {
  it("represents all six operations as strict discriminators", () => {
    expect(commands.map(({ operation }) => operation)).toEqual([
      "search",
      "create_folder",
      "create_document",
      "copy",
      "rename_file",
      "move_file",
    ]);
  });

  it("preserves execution, request, and workspace correlation", () => {
    expect(
      commands.map(({ executionId, requestId, workspaceId }) => ({
        executionId,
        requestId,
        workspaceId,
      })),
    ).toEqual([
      {
        executionId: "execution-search",
        requestId: "request-search",
        workspaceId: "workspace-001",
      },
      {
        executionId: "execution-folder",
        requestId: "request-folder",
        workspaceId: "workspace-001",
      },
      {
        executionId: "execution-document",
        requestId: "request-document",
        workspaceId: "workspace-001",
      },
      {
        executionId: "execution-copy",
        requestId: "request-copy",
        workspaceId: "workspace-001",
      },
      {
        executionId: "execution-rename",
        requestId: "request-rename",
        workspaceId: "workspace-001",
      },
      {
        executionId: "execution-move",
        requestId: "request-move",
        workspaceId: "workspace-001",
      },
    ]);
  });

  it("represents provider-neutral normalized resource evidence", () => {
    expect(resource).toEqual({
      resourceId: "resource-001",
      name: "Plan",
      resourceKind: "document",
      parentIds: ["parent-001"],
      resourceUrl: null,
      metadata: { opaqueRevision: "revision-001" },
    });
    expect(executedResults.map(({ operation }) => operation)).toEqual(
      commands.map(({ operation }) => operation),
    );
  });

  it("preserves operation-specific copy and move evidence", () => {
    const copyResult = executedResults.find(
      (result) => result.operation === "copy",
    );
    const moveResult = executedResults.find(
      (result) => result.operation === "move_file",
    );

    expect(copyResult?.evidence.sourceResourceId).toBe("source-001");
    expect(moveResult?.evidence).toMatchObject({
      previousParentIds: ["parent-001"],
      destinationParentId: "parent-002",
    });
  });

  it("distinguishes executed, failed, and uncertain results", () => {
    const results: readonly FilesystemAdapterExecutionResult[] = [
      executedResults[0]!,
      {
        status: "failed",
        executionId: "execution-failed",
        requestId: "request-failed",
        operation: "search",
        category: "not_found",
        message: "Resource not found.",
        retryable: false,
        providerMetadata: {},
      },
      {
        status: "uncertain",
        executionId: "execution-uncertain",
        requestId: "request-uncertain",
        operation: "create_document",
        message: "The provider state is unknown.",
        retryable: false,
        providerMetadata: {},
      },
    ];

    expect(results.map(({ status }) => status)).toEqual([
      "executed",
      "failed",
      "uncertain",
    ]);
  });

  it("defines the exact failure taxonomy", () => {
    const categories = [
      "invalid_request",
      "not_found",
      "conflict",
      "permission_denied",
      "rate_limited",
      "unavailable",
      "unsupported",
      "unknown",
    ] as const satisfies readonly FilesystemAdapterErrorCategory[];

    expect(categories).toEqual([
      "invalid_request",
      "not_found",
      "conflict",
      "permission_denied",
      "rate_limited",
      "unavailable",
      "unsupported",
      "unknown",
    ]);
  });

  it("keeps commands free of policy, verification, and record fields", () => {
    const forbiddenFields = [
      "policyDecision",
      "riskClass",
      "confirmationLevel",
      "confirmationStatus",
      "actorAuthorization",
      "workspaceStatus",
      "verificationMethod",
      "verificationStatus",
      "executionRecord",
      "memoryHint",
    ];

    for (const command of commands) {
      expect(Object.keys(command)).not.toEqual(
        expect.arrayContaining(forbiddenFields),
      );
    }
  });

  it("excludes undeclared operations and provider-specific fields", () => {
    expect(commands.map(({ operation }) => operation)).not.toEqual(
      expect.arrayContaining([
        "delete",
        "share",
        "permissions",
        "bulk",
        "cross_workspace",
      ]),
    );
    expect(Object.keys(resource)).not.toEqual(
      expect.arrayContaining(["driveId", "googleDriveId", "providerType"]),
    );
  });

  it("supports a deterministic minimal fake adapter", async () => {
    const adapter: FilesystemAdapter = new DeterministicFakeAdapter();
    const first = await adapter.execute(commands[2]!);
    const second = await adapter.execute(commands[2]!);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      status: "failed",
      executionId: "execution-document",
      requestId: "request-document",
      operation: "create_document",
      category: "unsupported",
      retryable: false,
    });
  });
});
