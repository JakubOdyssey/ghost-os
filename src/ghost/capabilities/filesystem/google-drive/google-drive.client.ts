import type { FilesystemResourceKind } from "../filesystem.adapter.js";

export interface GoogleDriveResourceRecord {
  readonly id: string | null;
  readonly name: string | null;
  readonly mimeType: string | null;
  readonly parentIds: readonly string[] | null;
  readonly webViewLink: string | null;
  readonly providerMetadata: Readonly<Record<string, unknown>>;
}

export interface GoogleDriveSearchInput {
  readonly workspaceId: string;
  readonly query: string;
  readonly parentId?: string;
  readonly resourceKind?: FilesystemResourceKind;
}

export interface GoogleDriveCreateFolderInput {
  readonly workspaceId: string;
  readonly parentId: string;
  readonly name: string;
}

export interface GoogleDriveCreateDocumentInput {
  readonly workspaceId: string;
  readonly parentId: string;
  readonly title: string;
  readonly content: string;
}

export interface GoogleDriveCopyInput {
  readonly workspaceId: string;
  readonly sourceId: string;
  readonly destinationParentId: string;
  readonly newName?: string;
}

export interface GoogleDriveRenameInput {
  readonly workspaceId: string;
  readonly targetId: string;
  readonly newName: string;
}

export interface GoogleDriveMoveInput {
  readonly workspaceId: string;
  readonly targetId: string;
  readonly sourceParentId: string;
  readonly destinationParentId: string;
}

export interface GoogleDriveRenameResult {
  readonly resource: GoogleDriveResourceRecord | null;
  readonly previousName: string | null;
}

export interface GoogleDriveClientError {
  readonly statusCode: number | null;
  readonly reason: string | null;
  readonly message: string;
  readonly requestDispatched: boolean;
  readonly responseReceived: boolean;
  readonly retryableHint: boolean | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Provider-specific client boundary without a dependency on a Google SDK. */
export interface GoogleDriveClientPort {
  search(
    input: GoogleDriveSearchInput,
  ): Promise<readonly GoogleDriveResourceRecord[]>;
  createFolder(
    input: GoogleDriveCreateFolderInput,
  ): Promise<GoogleDriveResourceRecord | null>;
  createDocument(
    input: GoogleDriveCreateDocumentInput,
  ): Promise<GoogleDriveResourceRecord | null>;
  copy(
    input: GoogleDriveCopyInput,
  ): Promise<GoogleDriveResourceRecord | null>;
  rename(input: GoogleDriveRenameInput): Promise<GoogleDriveRenameResult>;
  move(
    input: GoogleDriveMoveInput,
  ): Promise<GoogleDriveResourceRecord | null>;
}
