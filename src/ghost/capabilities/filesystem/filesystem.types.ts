import type {
  ConfirmationLevel,
  RiskClass,
} from "../../core/policy/policy.types.js";

export type {
  ConfirmationLevel,
  RiskClass,
} from "../../core/policy/policy.types.js";

export type FilesystemOperation =
  | "search"
  | "create_folder"
  | "create_document"
  | "copy"
  | "rename_file"
  | "move_file";

export type FilesystemStatus =
  | "success"
  | "failed"
  | "blocked"
  | "needs_confirmation"
  | "partial";

export type VerificationStatus =
  | "verified"
  | "failed"
  | "unverified"
  | "not_required";

export type ConfirmationStatus =
  | "not_required"
  | "required"
  | "approved"
  | "rejected";

export type MemoryHint = "ignore" | "working" | "long_term" | "review";

/** Identifies a logical workspace without binding it to a provider or machine. */
export interface FilesystemWorkspace {
  readonly workspaceId: string;
  readonly displayName?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Locates a provider-neutral resource; identifiers remain opaque to the runtime. */
export interface FilesystemTarget {
  readonly resourceId?: string;
  readonly parentResourceId?: string;
  readonly name?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface FilesystemRequest {
  readonly requestId: string;
  readonly actor: string;
  readonly capabilityId: "filesystem.v0";
  readonly operation: FilesystemOperation;
  readonly workspace: FilesystemWorkspace;
  readonly target: FilesystemTarget;
  readonly source?: FilesystemTarget;
  readonly input?: Readonly<Record<string, unknown>>;
  readonly requestedAt: string;
  readonly confirmationStatus: ConfirmationStatus;
  readonly memoryHint: MemoryHint;
}

export interface FilesystemResponse {
  readonly requestId: string;
  readonly capabilityId: "filesystem.v0";
  readonly operation: FilesystemOperation;
  readonly status: FilesystemStatus;
  readonly resourceId: string | null;
  readonly resourceUrl: string | null;
  readonly verificationStatus: VerificationStatus;
  readonly verificationSummary: string;
  readonly errorSummary: string | null;
  readonly confirmationStatus: ConfirmationStatus;
  readonly executionRecord: FilesystemExecutionRecord;
  readonly memoryHint: MemoryHint;
  readonly completedAt: string;
}

/** Captures a transport-neutral request outcome without prescribing persistence. */
export interface FilesystemExecutionRecord {
  readonly executionId: string;
  readonly requestId: string;
  readonly actor: string;
  readonly capabilityId: "filesystem.v0";
  readonly operation: FilesystemOperation;
  readonly workspaceId: string;
  readonly status: FilesystemStatus;
  readonly verificationStatus: VerificationStatus;
  readonly confirmationStatus: ConfirmationStatus;
  readonly riskClass: RiskClass;
  readonly confirmationLevel: ConfirmationLevel;
  readonly memoryHint: MemoryHint;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
