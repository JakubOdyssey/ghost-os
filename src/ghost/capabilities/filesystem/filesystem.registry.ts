import type { FilesystemOperation } from "./filesystem.types.js";

export type RegistryGuardStatus = "allowed" | "blocked";

export interface RegistryGuardResult {
  readonly status: RegistryGuardStatus;
  readonly capabilityId: string;
  readonly operation: string;
  readonly reason: string | null;
}

export interface FilesystemRegistryEntry {
  readonly capabilityId: "filesystem.v0";
  readonly status: "specified";
  readonly readiness: "adapter_implementation_ready";
  readonly firstAdapter: "GoogleDriveFilesystemAdapter";
  readonly operations: readonly FilesystemOperation[];
}

export const FILESYSTEM_OPERATIONS = [
  "search",
  "create_folder",
  "create_document",
  "copy",
  "rename_file",
  "move_file",
] as const satisfies readonly FilesystemOperation[];

export const FILESYSTEM_REGISTRY_ENTRY: FilesystemRegistryEntry = {
  capabilityId: "filesystem.v0",
  status: "specified",
  readiness: "adapter_implementation_ready",
  firstAdapter: "GoogleDriveFilesystemAdapter",
  operations: FILESYSTEM_OPERATIONS,
};

const registeredOperations = new Set<string>(FILESYSTEM_OPERATIONS);

/** Validates registry membership only; authorization belongs to a later guard. */
export function guardFilesystemRegistry(
  capabilityId: string,
  operation: string,
): RegistryGuardResult {
  if (capabilityId !== FILESYSTEM_REGISTRY_ENTRY.capabilityId) {
    return {
      status: "blocked",
      capabilityId,
      operation,
      reason: `Unknown capability ID: ${capabilityId}`,
    };
  }

  if (!registeredOperations.has(operation)) {
    return {
      status: "blocked",
      capabilityId,
      operation,
      reason: `Unknown operation for ${capabilityId}: ${operation}`,
    };
  }

  return {
    status: "allowed",
    capabilityId,
    operation,
    reason: null,
  };
}
