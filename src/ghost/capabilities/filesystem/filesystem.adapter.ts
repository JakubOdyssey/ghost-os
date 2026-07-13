import type { FilesystemOperation } from "./filesystem.types.js";

interface FilesystemAdapterCommandContext {
  readonly executionId: string;
  readonly requestId: string;
  readonly workspaceId: string;
}

export type FilesystemResourceKind =
  | "file"
  | "folder"
  | "document"
  | "unknown";

export interface FilesystemResourceEvidence {
  readonly resourceId: string;
  readonly name: string;
  readonly resourceKind: FilesystemResourceKind;
  readonly parentIds: readonly string[];
  readonly resourceUrl: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface FilesystemSearchCommand
  extends FilesystemAdapterCommandContext {
  readonly operation: "search";
  readonly query: string;
  readonly parentId?: string;
  readonly resourceKind?: FilesystemResourceKind;
}

export interface FilesystemCreateFolderCommand
  extends FilesystemAdapterCommandContext {
  readonly operation: "create_folder";
  readonly parentId: string;
  readonly name: string;
}

export interface FilesystemCreateDocumentCommand
  extends FilesystemAdapterCommandContext {
  readonly operation: "create_document";
  readonly parentId: string;
  readonly title: string;
  readonly content: string;
}

export interface FilesystemCopyCommand extends FilesystemAdapterCommandContext {
  readonly operation: "copy";
  readonly sourceId: string;
  readonly destinationParentId: string;
  readonly newName?: string;
}

export interface FilesystemRenameFileCommand
  extends FilesystemAdapterCommandContext {
  readonly operation: "rename_file";
  readonly targetId: string;
  readonly newName: string;
}

export interface FilesystemMoveFileCommand
  extends FilesystemAdapterCommandContext {
  readonly operation: "move_file";
  readonly targetId: string;
  readonly sourceParentId: string;
  readonly destinationParentId: string;
}

export type FilesystemAdapterCommand =
  | FilesystemSearchCommand
  | FilesystemCreateFolderCommand
  | FilesystemCreateDocumentCommand
  | FilesystemCopyCommand
  | FilesystemRenameFileCommand
  | FilesystemMoveFileCommand;

export interface FilesystemSearchEvidence {
  readonly candidates: readonly FilesystemResourceEvidence[];
}

export interface FilesystemCreateFolderEvidence {
  readonly resource: FilesystemResourceEvidence;
}

export interface FilesystemCreateDocumentEvidence {
  readonly resource: FilesystemResourceEvidence;
}

export interface FilesystemCopyEvidence {
  readonly resource: FilesystemResourceEvidence;
  readonly sourceResourceId: string;
}

export interface FilesystemRenameFileEvidence {
  readonly resource: FilesystemResourceEvidence;
  readonly previousName: string;
}

export interface FilesystemMoveFileEvidence {
  readonly resource: FilesystemResourceEvidence;
  readonly previousParentIds: readonly string[];
  readonly destinationParentId: string;
}

interface FilesystemAdapterResultContext {
  readonly executionId: string;
  readonly requestId: string;
  readonly providerMetadata: Readonly<Record<string, unknown>>;
}

export interface FilesystemSearchExecutedResult
  extends FilesystemAdapterResultContext {
  readonly status: "executed";
  readonly operation: "search";
  readonly evidence: FilesystemSearchEvidence;
}

export interface FilesystemCreateFolderExecutedResult
  extends FilesystemAdapterResultContext {
  readonly status: "executed";
  readonly operation: "create_folder";
  readonly evidence: FilesystemCreateFolderEvidence;
}

export interface FilesystemCreateDocumentExecutedResult
  extends FilesystemAdapterResultContext {
  readonly status: "executed";
  readonly operation: "create_document";
  readonly evidence: FilesystemCreateDocumentEvidence;
}

export interface FilesystemCopyExecutedResult
  extends FilesystemAdapterResultContext {
  readonly status: "executed";
  readonly operation: "copy";
  readonly evidence: FilesystemCopyEvidence;
}

export interface FilesystemRenameFileExecutedResult
  extends FilesystemAdapterResultContext {
  readonly status: "executed";
  readonly operation: "rename_file";
  readonly evidence: FilesystemRenameFileEvidence;
}

export interface FilesystemMoveFileExecutedResult
  extends FilesystemAdapterResultContext {
  readonly status: "executed";
  readonly operation: "move_file";
  readonly evidence: FilesystemMoveFileEvidence;
}

export type FilesystemAdapterExecutedResult =
  | FilesystemSearchExecutedResult
  | FilesystemCreateFolderExecutedResult
  | FilesystemCreateDocumentExecutedResult
  | FilesystemCopyExecutedResult
  | FilesystemRenameFileExecutedResult
  | FilesystemMoveFileExecutedResult;

export type FilesystemAdapterErrorCategory =
  | "invalid_request"
  | "not_found"
  | "conflict"
  | "permission_denied"
  | "rate_limited"
  | "unavailable"
  | "unsupported"
  | "unknown";

export interface FilesystemAdapterFailedResult
  extends FilesystemAdapterResultContext {
  readonly status: "failed";
  readonly operation: FilesystemOperation;
  readonly category: FilesystemAdapterErrorCategory;
  readonly message: string;
  readonly retryable: boolean;
}

/** The operation may have executed, but its final provider state is unknown. */
export interface FilesystemAdapterUncertainResult
  extends FilesystemAdapterResultContext {
  readonly status: "uncertain";
  readonly operation: FilesystemOperation;
  readonly message: string;
  readonly retryable: boolean;
}

export type FilesystemAdapterExecutionResult =
  | FilesystemAdapterExecutedResult
  | FilesystemAdapterFailedResult
  | FilesystemAdapterUncertainResult;

export interface FilesystemAdapter {
  /**
   * Runtime decides whether to retry. Mutating commands must not be retried
   * blindly after an uncertain result because doing so can duplicate a change.
   */
  execute(
    command: FilesystemAdapterCommand,
  ): Promise<FilesystemAdapterExecutionResult>;
}
