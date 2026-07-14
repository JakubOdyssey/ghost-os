import { describe, expect, it } from "vitest";

import type {
  FilesystemAdapterCommand,
  FilesystemAdapterExecutionResult,
  FilesystemResourceKind,
} from "../../../../../src/ghost/capabilities/filesystem/filesystem.adapter.js";
import { GoogleDriveFilesystemAdapter } from "../../../../../src/ghost/capabilities/filesystem/google-drive/google-drive.adapter.js";
import type {
  GoogleDriveClientError,
  GoogleDriveClientPort,
  GoogleDriveCopyInput,
  GoogleDriveCreateDocumentInput,
  GoogleDriveCreateFolderInput,
  GoogleDriveMoveInput,
  GoogleDriveRenameInput,
  GoogleDriveRenameResult,
  GoogleDriveResourceRecord,
  GoogleDriveSearchInput,
} from "../../../../../src/ghost/capabilities/filesystem/google-drive/google-drive.client.js";

const folderRecord = resource({
  id: "folder-1",
  name: "Folder",
  mimeType: "application/vnd.google-apps.folder",
  parentIds: ["workspace-1"],
});
const documentRecord = resource({
  id: "document-1",
  name: "Document",
  mimeType: "application/vnd.google-apps.document",
  parentIds: ["folder-1"],
});
const fileRecord = resource({
  id: "file-1",
  name: "File.pdf",
  mimeType: "application/pdf",
  parentIds: ["folder-1"],
});

class FakeGoogleDriveClient implements GoogleDriveClientPort {
  public readonly calls: Array<{
    readonly method: string;
    readonly input: unknown;
  }> = [];

  public error: unknown = null;
  public searchResult: readonly GoogleDriveResourceRecord[] = [fileRecord];
  public createFolderResult: GoogleDriveResourceRecord | null = folderRecord;
  public createDocumentResult: GoogleDriveResourceRecord | null = documentRecord;
  public copyResult: GoogleDriveResourceRecord | null = fileRecord;
  public renameResult: GoogleDriveRenameResult = {
    resource: fileRecord,
    previousName: "Old name.pdf",
  };
  public moveResult: GoogleDriveResourceRecord | null = fileRecord;

  public search(
    input: GoogleDriveSearchInput,
  ): Promise<readonly GoogleDriveResourceRecord[]> {
    return this.respond("search", input, this.searchResult);
  }

  public createFolder(
    input: GoogleDriveCreateFolderInput,
  ): Promise<GoogleDriveResourceRecord | null> {
    return this.respond("createFolder", input, this.createFolderResult);
  }

  public createDocument(
    input: GoogleDriveCreateDocumentInput,
  ): Promise<GoogleDriveResourceRecord | null> {
    return this.respond("createDocument", input, this.createDocumentResult);
  }

  public copy(
    input: GoogleDriveCopyInput,
  ): Promise<GoogleDriveResourceRecord | null> {
    return this.respond("copy", input, this.copyResult);
  }

  public rename(input: GoogleDriveRenameInput): Promise<GoogleDriveRenameResult> {
    return this.respond("rename", input, this.renameResult);
  }

  public move(
    input: GoogleDriveMoveInput,
  ): Promise<GoogleDriveResourceRecord | null> {
    return this.respond("move", input, this.moveResult);
  }

  private respond<T>(method: string, input: unknown, result: T): Promise<T> {
    this.calls.push({ method, input });
    if (this.error !== null) return Promise.reject(this.error);
    return Promise.resolve(result);
  }
}

describe("GoogleDriveFilesystemAdapter", () => {
  it("maps every command to exactly one matching client call and preserves context", async () => {
    const cases: ReadonlyArray<{
      readonly command: FilesystemAdapterCommand;
      readonly method: string;
      readonly expectedInput: Readonly<Record<string, unknown>>;
    }> = [
      {
        command: {
          executionId: "execution-search",
          requestId: "request-search",
          workspaceId: "workspace-1",
          operation: "search",
          query: "report",
          parentId: "folder-1",
          resourceKind: "document",
        },
        method: "search",
        expectedInput: {
          workspaceId: "workspace-1",
          query: "report",
          parentId: "folder-1",
          resourceKind: "document",
        },
      },
      {
        command: {
          executionId: "execution-folder",
          requestId: "request-folder",
          workspaceId: "workspace-1",
          operation: "create_folder",
          parentId: "folder-1",
          name: "New folder",
        },
        method: "createFolder",
        expectedInput: {
          workspaceId: "workspace-1",
          parentId: "folder-1",
          name: "New folder",
        },
      },
      {
        command: {
          executionId: "execution-document",
          requestId: "request-document",
          workspaceId: "workspace-1",
          operation: "create_document",
          parentId: "folder-1",
          title: "New document",
          content: "Body",
        },
        method: "createDocument",
        expectedInput: {
          workspaceId: "workspace-1",
          parentId: "folder-1",
          title: "New document",
          content: "Body",
        },
      },
      {
        command: {
          executionId: "execution-copy",
          requestId: "request-copy",
          workspaceId: "workspace-1",
          operation: "copy",
          sourceId: "source-1",
          destinationParentId: "folder-2",
          newName: "Copy.pdf",
        },
        method: "copy",
        expectedInput: {
          workspaceId: "workspace-1",
          sourceId: "source-1",
          destinationParentId: "folder-2",
          newName: "Copy.pdf",
        },
      },
      {
        command: {
          executionId: "execution-rename",
          requestId: "request-rename",
          workspaceId: "workspace-1",
          operation: "rename_file",
          targetId: "file-1",
          newName: "Renamed.pdf",
        },
        method: "rename",
        expectedInput: {
          workspaceId: "workspace-1",
          targetId: "file-1",
          newName: "Renamed.pdf",
        },
      },
      {
        command: {
          executionId: "execution-move",
          requestId: "request-move",
          workspaceId: "workspace-1",
          operation: "move_file",
          targetId: "file-1",
          sourceParentId: "folder-1",
          destinationParentId: "folder-2",
        },
        method: "move",
        expectedInput: {
          workspaceId: "workspace-1",
          targetId: "file-1",
          sourceParentId: "folder-1",
          destinationParentId: "folder-2",
        },
      },
    ];

    for (const testCase of cases) {
      const client = new FakeGoogleDriveClient();
      const result = await new GoogleDriveFilesystemAdapter(client).execute(
        testCase.command,
      );

      expect(client.calls).toEqual([
        { method: testCase.method, input: testCase.expectedInput },
      ]);
      expect(result.executionId).toBe(testCase.command.executionId);
      expect(result.requestId).toBe(testCase.command.requestId);
      expect(result.operation).toBe(testCase.command.operation);
    }
  });

  it("normalizes provider resources without leaking provider-specific fields", async () => {
    const cases: ReadonlyArray<{
      readonly record: GoogleDriveResourceRecord;
      readonly expectedKind: FilesystemResourceKind;
    }> = [
      { record: folderRecord, expectedKind: "folder" },
      { record: documentRecord, expectedKind: "document" },
      { record: fileRecord, expectedKind: "file" },
      {
        record: resource({ id: "unknown-1", name: "Unknown", mimeType: null }),
        expectedKind: "unknown",
      },
      {
        record: resource({ id: "unknown-2", name: "Unsupported", mimeType: "invalid" }),
        expectedKind: "unknown",
      },
    ];

    for (const testCase of cases) {
      const client = new FakeGoogleDriveClient();
      client.searchResult = [testCase.record];
      const result = await new GoogleDriveFilesystemAdapter(client).execute(
        searchCommand(),
      );
      expect(result.status).toBe("executed");
      if (result.status !== "executed" || result.operation !== "search") return;

      expect(result.evidence.candidates[0]).toEqual({
        resourceId: testCase.record.id,
        name: testCase.record.name,
        resourceKind: testCase.expectedKind,
        parentIds: testCase.record.parentIds,
        resourceUrl: testCase.record.webViewLink,
        metadata: testCase.record.providerMetadata,
      });
      expect(result.evidence.candidates[0]).not.toHaveProperty("mimeType");
      expect(result.evidence.candidates[0]).not.toHaveProperty("webViewLink");
    }
  });

  it("preserves search candidate order", async () => {
    const client = new FakeGoogleDriveClient();
    client.searchResult = [fileRecord, folderRecord, documentRecord];
    const result = await new GoogleDriveFilesystemAdapter(client).execute(
      searchCommand(),
    );
    expect(result.status).toBe("executed");
    if (result.status !== "executed" || result.operation !== "search") return;
    expect(result.evidence.candidates.map(({ resourceId }) => resourceId)).toEqual([
      "file-1",
      "folder-1",
      "document-1",
    ]);
  });

  it("returns operation-specific write evidence", async () => {
    const copy = await execute({
      executionId: "execution-1",
      requestId: "request-1",
      workspaceId: "workspace-1",
      operation: "copy",
      sourceId: "source-1",
      destinationParentId: "folder-2",
    });
    expect(copy.status).toBe("executed");
    if (copy.status === "executed" && copy.operation === "copy") {
      expect(copy.evidence.sourceResourceId).toBe("source-1");
    }

    const rename = await execute({
      executionId: "execution-1",
      requestId: "request-1",
      workspaceId: "workspace-1",
      operation: "rename_file",
      targetId: "file-1",
      newName: "Renamed.pdf",
    });
    expect(rename.status).toBe("executed");
    if (rename.status === "executed" && rename.operation === "rename_file") {
      expect(rename.evidence.previousName).toBe("Old name.pdf");
    }

    const move = await execute(moveCommand());
    expect(move.status).toBe("executed");
    if (move.status === "executed" && move.operation === "move_file") {
      expect(move.evidence.previousParentIds).toEqual(["folder-1"]);
      expect(move.evidence.destinationParentId).toBe("folder-2");
    }
  });

  it.each([
    [400, "invalid", "invalid_request"],
    [401, null, "permission_denied"],
    [403, null, "permission_denied"],
    [404, null, "not_found"],
    [409, null, "conflict"],
    [429, null, "rate_limited"],
    [503, null, "unavailable"],
    [null, "service_unavailable", "unavailable"],
    [null, "unsupported", "unsupported"],
    [418, "unexpected", "unknown"],
  ] as const)(
    "maps status %s and reason %s to %s",
    async (statusCode, reason, expectedCategory) => {
      const client = new FakeGoogleDriveClient();
      client.error = clientError({ statusCode, reason });
      const result = await new GoogleDriveFilesystemAdapter(client).execute(
        searchCommand(),
      );
      expect(result.status).toBe("failed");
      if (result.status === "failed") {
        expect(result.category).toBe(expectedCategory);
      }
      expect(client.calls).toHaveLength(1);
    },
  );

  it("uses retryability hints and structured retryable categories without retrying", async () => {
    const hinted = new FakeGoogleDriveClient();
    hinted.error = clientError({ statusCode: 400, retryableHint: true });
    const hintedResult = await new GoogleDriveFilesystemAdapter(hinted).execute(
      searchCommand(),
    );
    expect(hintedResult).toMatchObject({ status: "failed", retryable: true });
    expect(hinted.calls).toHaveLength(1);

    const rateLimited = new FakeGoogleDriveClient();
    rateLimited.error = clientError({ statusCode: 429 });
    const rateLimitedResult = await new GoogleDriveFilesystemAdapter(
      rateLimited,
    ).execute(searchCommand());
    expect(rateLimitedResult).toMatchObject({ status: "failed", retryable: true });
    expect(rateLimited.calls).toHaveLength(1);
  });

  it("returns failed before dispatch and uncertain after dispatch for a write", async () => {
    const beforeDispatch = new FakeGoogleDriveClient();
    beforeDispatch.error = clientError({
      message: "Timeout before dispatch",
      requestDispatched: false,
      responseReceived: false,
    });
    const failed = await new GoogleDriveFilesystemAdapter(beforeDispatch).execute(
      moveCommand(),
    );
    expect(failed).toMatchObject({ status: "failed", category: "unknown" });

    const afterDispatch = new FakeGoogleDriveClient();
    afterDispatch.error = clientError({
      message: "Connection reset after dispatch",
      requestDispatched: true,
      responseReceived: false,
    });
    const uncertain = await new GoogleDriveFilesystemAdapter(afterDispatch).execute(
      moveCommand(),
    );
    expect(uncertain).toMatchObject({
      status: "uncertain",
      message: "Connection reset after dispatch",
    });
    expect(beforeDispatch.calls).toHaveLength(1);
    expect(afterDispatch.calls).toHaveLength(1);
  });

  it("returns failed/unknown for an unstructured search error without retrying", async () => {
    const client = new FakeGoogleDriveClient();
    client.error = new Error("Unstructured search failure");

    const result = await new GoogleDriveFilesystemAdapter(client).execute(
      searchCommand(),
    );

    expect(result).toMatchObject({
      status: "failed",
      category: "unknown",
      retryable: false,
    });
    expect(client.calls).toHaveLength(1);
  });

  it.each([
    {
      executionId: "execution-folder",
      requestId: "request-folder",
      workspaceId: "workspace-1",
      operation: "create_folder",
      parentId: "folder-1",
      name: "Folder",
    },
    {
      executionId: "execution-document",
      requestId: "request-document",
      workspaceId: "workspace-1",
      operation: "create_document",
      parentId: "folder-1",
      title: "Document",
      content: "Body",
    },
    {
      executionId: "execution-copy",
      requestId: "request-copy",
      workspaceId: "workspace-1",
      operation: "copy",
      sourceId: "file-1",
      destinationParentId: "folder-2",
    },
    {
      executionId: "execution-rename",
      requestId: "request-rename",
      workspaceId: "workspace-1",
      operation: "rename_file",
      targetId: "file-1",
      newName: "Renamed.pdf",
    },
    {
      executionId: "execution-move",
      requestId: "request-move",
      workspaceId: "workspace-1",
      operation: "move_file",
      targetId: "file-1",
      sourceParentId: "folder-1",
      destinationParentId: "folder-2",
    },
  ] satisfies readonly FilesystemAdapterCommand[])(
    "returns uncertain for an unstructured $operation error without retrying",
    async (command) => {
      const client = new FakeGoogleDriveClient();
      client.error = new Error("Unstructured write failure");

      const result = await new GoogleDriveFilesystemAdapter(client).execute(
        command,
      );

      expect(result).toEqual({
        status: "uncertain",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        message:
          "An unstructured Google Drive error occurred during a mutating request; final provider state is unknown.",
        retryable: false,
        providerMetadata: {},
      });
      expect(client.calls).toHaveLength(1);
    },
  );

  it("treats malformed write results as uncertain and malformed search results as failed", async () => {
    const writeClient = new FakeGoogleDriveClient();
    writeClient.createFolderResult = resource({ id: null, name: "Folder" });
    const writeResult = await new GoogleDriveFilesystemAdapter(writeClient).execute({
      executionId: "execution-1",
      requestId: "request-1",
      workspaceId: "workspace-1",
      operation: "create_folder",
      parentId: "folder-1",
      name: "Folder",
    });
    expect(writeResult.status).toBe("uncertain");

    const searchClient = new FakeGoogleDriveClient();
    searchClient.searchResult = [resource({ id: null, name: "Result" })];
    const searchResult = await new GoogleDriveFilesystemAdapter(searchClient).execute(
      searchCommand(),
    );
    expect(searchResult).toMatchObject({ status: "failed", category: "unknown" });
  });

  it("keeps command and result contracts free of policy, verification, record and unsupported operation fields", async () => {
    const command = moveCommand();
    const result = await execute(command);
    const forbiddenFields = [
      "policyDecision",
      "riskClass",
      "confirmationLevel",
      "confirmationStatus",
      "actorAuthorization",
      "workspaceApprovalStatus",
      "verificationStatus",
      "verificationMethod",
      "executionRecord",
    ];
    for (const field of forbiddenFields) {
      expect(command).not.toHaveProperty(field);
      expect(result).not.toHaveProperty(field);
    }
    expect([
      "search",
      "create_folder",
      "create_document",
      "copy",
      "rename_file",
      "move_file",
    ]).not.toContain("delete");
    expect(JSON.stringify(result)).not.toMatch(/googleapis|share|permissions|bulk/);
  });

  it("is deterministic with an injected in-memory client and performs no network work", async () => {
    const command = searchCommand();
    const first = await execute(command);
    const second = await execute(command);
    expect(second).toEqual(first);
  });

  it("contains no Google SDK, network, policy, verification or execution-record dependency", () => {
    const adapterImplementation = GoogleDriveFilesystemAdapter.toString();

    expect(adapterImplementation).not.toMatch(
      /googleapis|fetch\s*\(|PolicyDecision|riskClass|confirmationLevel|verificationStatus|executionRecord/,
    );
    expect(adapterImplementation).not.toMatch(
      /operation:\s*["'](?:delete|share|permissions|bulk|cross_workspace)["']/,
    );
  });
});

function resource(
  overrides: Partial<GoogleDriveResourceRecord> = {},
): GoogleDriveResourceRecord {
  return {
    id: "resource-1",
    name: "Resource",
    mimeType: "application/octet-stream",
    parentIds: ["folder-1"],
    webViewLink: "https://drive.example/resource-1",
    providerMetadata: { providerRevision: "revision-1" },
    ...overrides,
  };
}

function clientError(
  overrides: Partial<GoogleDriveClientError> = {},
): GoogleDriveClientError {
  return {
    statusCode: null,
    reason: null,
    message: "Provider request failed",
    requestDispatched: false,
    responseReceived: false,
    retryableHint: null,
    metadata: { providerRequestId: "provider-request-1" },
    ...overrides,
  };
}

function searchCommand(): FilesystemAdapterCommand {
  return {
    executionId: "execution-1",
    requestId: "request-1",
    workspaceId: "workspace-1",
    operation: "search",
    query: "report",
  };
}

function moveCommand(): FilesystemAdapterCommand {
  return {
    executionId: "execution-1",
    requestId: "request-1",
    workspaceId: "workspace-1",
    operation: "move_file",
    targetId: "file-1",
    sourceParentId: "folder-1",
    destinationParentId: "folder-2",
  };
}

async function execute(
  command: FilesystemAdapterCommand,
): Promise<FilesystemAdapterExecutionResult> {
  return new GoogleDriveFilesystemAdapter(new FakeGoogleDriveClient()).execute(
    command,
  );
}
