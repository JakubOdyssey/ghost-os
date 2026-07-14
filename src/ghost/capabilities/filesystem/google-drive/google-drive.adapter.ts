import type {
  FilesystemAdapter,
  FilesystemAdapterCommand,
  FilesystemAdapterErrorCategory,
  FilesystemAdapterExecutionResult,
  FilesystemResourceEvidence,
  FilesystemResourceKind,
} from "../filesystem.adapter.js";
import type {
  GoogleDriveClientError,
  GoogleDriveClientPort,
  GoogleDriveResourceRecord,
} from "./google-drive.client.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const DOCUMENT_MIME_TYPE = "application/vnd.google-apps.document";

type MutatingCommand = Exclude<
  FilesystemAdapterCommand,
  { readonly operation: "search" }
>;

export class GoogleDriveFilesystemAdapter implements FilesystemAdapter {
  public constructor(private readonly client: GoogleDriveClientPort) {}

  public async execute(
    command: FilesystemAdapterCommand,
  ): Promise<FilesystemAdapterExecutionResult> {
    switch (command.operation) {
      case "search":
        return this.executeSearch(command);
      case "create_folder":
        return this.executeCreateFolder(command);
      case "create_document":
        return this.executeCreateDocument(command);
      case "copy":
        return this.executeCopy(command);
      case "rename_file":
        return this.executeRename(command);
      case "move_file":
        return this.executeMove(command);
    }
  }

  private async executeSearch(
    command: Extract<FilesystemAdapterCommand, { readonly operation: "search" }>,
  ): Promise<FilesystemAdapterExecutionResult> {
    try {
      const records = await this.client.search({
        workspaceId: command.workspaceId,
        query: command.query,
        ...(command.parentId === undefined ? {} : { parentId: command.parentId }),
        ...(command.resourceKind === undefined
          ? {}
          : { resourceKind: command.resourceKind }),
      });
      const candidates: FilesystemResourceEvidence[] = [];

      for (const record of records) {
        const resource = normalizeResource(record);
        if (resource === null) {
          return malformedSearchResult(command);
        }
        candidates.push(resource);
      }

      return {
        status: "executed",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        evidence: { candidates },
        providerMetadata: {},
      };
    } catch (error: unknown) {
      return failedResult(command, error);
    }
  }

  private async executeCreateFolder(
    command: Extract<
      FilesystemAdapterCommand,
      { readonly operation: "create_folder" }
    >,
  ): Promise<FilesystemAdapterExecutionResult> {
    try {
      const record = await this.client.createFolder({
        workspaceId: command.workspaceId,
        parentId: command.parentId,
        name: command.name,
      });
      const resource = normalizeResource(record);
      if (resource === null) return malformedWriteResult(command);

      return {
        status: "executed",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        evidence: { resource },
        providerMetadata: {},
      };
    } catch (error: unknown) {
      return writeErrorResult(command, error);
    }
  }

  private async executeCreateDocument(
    command: Extract<
      FilesystemAdapterCommand,
      { readonly operation: "create_document" }
    >,
  ): Promise<FilesystemAdapterExecutionResult> {
    try {
      const record = await this.client.createDocument({
        workspaceId: command.workspaceId,
        parentId: command.parentId,
        title: command.title,
        content: command.content,
      });
      const resource = normalizeResource(record);
      if (resource === null) return malformedWriteResult(command);

      return {
        status: "executed",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        evidence: { resource },
        providerMetadata: {},
      };
    } catch (error: unknown) {
      return writeErrorResult(command, error);
    }
  }

  private async executeCopy(
    command: Extract<FilesystemAdapterCommand, { readonly operation: "copy" }>,
  ): Promise<FilesystemAdapterExecutionResult> {
    try {
      const record = await this.client.copy({
        workspaceId: command.workspaceId,
        sourceId: command.sourceId,
        destinationParentId: command.destinationParentId,
        ...(command.newName === undefined ? {} : { newName: command.newName }),
      });
      const resource = normalizeResource(record);
      if (resource === null) return malformedWriteResult(command);

      return {
        status: "executed",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        evidence: {
          resource,
          sourceResourceId: command.sourceId,
        },
        providerMetadata: {},
      };
    } catch (error: unknown) {
      return writeErrorResult(command, error);
    }
  }

  private async executeRename(
    command: Extract<
      FilesystemAdapterCommand,
      { readonly operation: "rename_file" }
    >,
  ): Promise<FilesystemAdapterExecutionResult> {
    try {
      const result = await this.client.rename({
        workspaceId: command.workspaceId,
        targetId: command.targetId,
        newName: command.newName,
      });
      const resource = normalizeResource(result.resource);
      if (resource === null || !isNonEmpty(result.previousName)) {
        return malformedWriteResult(command);
      }

      return {
        status: "executed",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        evidence: {
          resource,
          previousName: result.previousName,
        },
        providerMetadata: {},
      };
    } catch (error: unknown) {
      return writeErrorResult(command, error);
    }
  }

  private async executeMove(
    command: Extract<
      FilesystemAdapterCommand,
      { readonly operation: "move_file" }
    >,
  ): Promise<FilesystemAdapterExecutionResult> {
    try {
      const record = await this.client.move({
        workspaceId: command.workspaceId,
        targetId: command.targetId,
        sourceParentId: command.sourceParentId,
        destinationParentId: command.destinationParentId,
      });
      const resource = normalizeResource(record);
      if (resource === null) return malformedWriteResult(command);

      return {
        status: "executed",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        evidence: {
          resource,
          previousParentIds: [command.sourceParentId],
          destinationParentId: command.destinationParentId,
        },
        providerMetadata: {},
      };
    } catch (error: unknown) {
      return writeErrorResult(command, error);
    }
  }
}

function normalizeResource(
  record: GoogleDriveResourceRecord | null,
): FilesystemResourceEvidence | null {
  if (record === null || !isNonEmpty(record.id) || !isNonEmpty(record.name)) {
    return null;
  }

  return {
    resourceId: record.id,
    name: record.name,
    resourceKind: normalizeResourceKind(record.mimeType),
    parentIds: record.parentIds ?? [],
    resourceUrl: record.webViewLink,
    metadata: record.providerMetadata,
  };
}

function normalizeResourceKind(mimeType: string | null): FilesystemResourceKind {
  if (mimeType === FOLDER_MIME_TYPE) return "folder";
  if (mimeType === DOCUMENT_MIME_TYPE) return "document";
  if (mimeType !== null && /^[^/\s]+\/[^/\s]+$/.test(mimeType)) return "file";
  return "unknown";
}

function malformedSearchResult(
  command: Extract<FilesystemAdapterCommand, { readonly operation: "search" }>,
): FilesystemAdapterExecutionResult {
  return {
    status: "failed",
    executionId: command.executionId,
    requestId: command.requestId,
    operation: command.operation,
    category: "unknown",
    message: "Google Drive search returned an incomplete resource record.",
    retryable: false,
    providerMetadata: {},
  };
}

function malformedWriteResult(
  command: MutatingCommand,
): FilesystemAdapterExecutionResult {
  return {
    status: "uncertain",
    executionId: command.executionId,
    requestId: command.requestId,
    operation: command.operation,
    message: "Google Drive returned an incomplete result after a mutating request.",
    retryable: false,
    providerMetadata: {},
  };
}

function failedResult(
  command: FilesystemAdapterCommand,
  error: unknown,
): FilesystemAdapterExecutionResult {
  const clientError = isGoogleDriveClientError(error) ? error : null;
  const category = mapErrorCategory(clientError);
  return {
    status: "failed",
    executionId: command.executionId,
    requestId: command.requestId,
    operation: command.operation,
    category,
    message: clientError?.message ?? "Unknown Google Drive client failure.",
    retryable: deriveRetryable(category, clientError),
    providerMetadata: clientError?.metadata ?? {},
  };
}

function writeErrorResult(
  command: MutatingCommand,
  error: unknown,
): FilesystemAdapterExecutionResult {
  if (!isGoogleDriveClientError(error)) {
    return {
      status: "uncertain",
      executionId: command.executionId,
      requestId: command.requestId,
      operation: command.operation,
      message:
        "An unstructured Google Drive error occurred during a mutating request; final provider state is unknown.",
      retryable: false,
      providerMetadata: {},
    };
  }

  if (error.requestDispatched) {
    const category = mapErrorCategory(error);
    if (
      !error.responseReceived ||
      category === "unknown" ||
      category === "unavailable"
    ) {
      return {
        status: "uncertain",
        executionId: command.executionId,
        requestId: command.requestId,
        operation: command.operation,
        message: error.message,
        retryable: deriveRetryable(category, error),
        providerMetadata: error.metadata,
      };
    }
  }

  return failedResult(command, error);
}

function mapErrorCategory(
  error: GoogleDriveClientError | null,
): FilesystemAdapterErrorCategory {
  if (error === null) return "unknown";

  const reason = error.reason
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (
    error.statusCode === 400 ||
    reason === "invalid" ||
    reason === "invalidargument" ||
    reason === "invalidinput"
  ) {
    return "invalid_request";
  }
  if (error.statusCode === 401 || error.statusCode === 403) {
    return "permission_denied";
  }
  if (error.statusCode === 404) return "not_found";
  if (error.statusCode === 409) return "conflict";
  if (error.statusCode === 429) return "rate_limited";
  if (
    (error.statusCode !== null &&
      error.statusCode >= 500 &&
      error.statusCode <= 599) ||
    reason === "serviceunavailable" ||
    reason === "unavailable"
  ) {
    return "unavailable";
  }
  if (reason === "unsupported" || reason === "notsupported") {
    return "unsupported";
  }
  return "unknown";
}

function deriveRetryable(
  category: FilesystemAdapterErrorCategory,
  error: GoogleDriveClientError | null,
): boolean {
  return (
    error?.retryableHint ??
    (category === "rate_limited" || category === "unavailable")
  );
}

function isGoogleDriveClientError(error: unknown): error is GoogleDriveClientError {
  if (typeof error !== "object" || error === null) return false;
  const value = error as Readonly<Record<string, unknown>>;
  return (
    (typeof value.statusCode === "number" || value.statusCode === null) &&
    (typeof value.reason === "string" || value.reason === null) &&
    typeof value.message === "string" &&
    typeof value.requestDispatched === "boolean" &&
    typeof value.responseReceived === "boolean" &&
    (typeof value.retryableHint === "boolean" || value.retryableHint === null) &&
    typeof value.metadata === "object" &&
    value.metadata !== null
  );
}

function isNonEmpty(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}
