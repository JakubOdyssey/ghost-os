export type GoogleDriveWorkspaceMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

interface GoogleDriveWorkspaceResultContext {
  readonly workspaceId: string;
  readonly message: string;
  readonly metadata: GoogleDriveWorkspaceMetadata;
}

export interface GoogleDriveApprovedWorkspaceResult
  extends GoogleDriveWorkspaceResultContext {
  readonly status: "approved";
  readonly code: "google_drive_workspace_approved";
  readonly provider: "google_drive";
  readonly driveId: string;
  readonly rootFolderId: string;
}

export interface GoogleDriveRestrictedWorkspaceResult
  extends GoogleDriveWorkspaceResultContext {
  readonly status: "restricted";
  readonly code: "google_drive_workspace_restricted";
}

export interface GoogleDriveUnknownWorkspaceResult
  extends GoogleDriveWorkspaceResultContext {
  readonly status: "unknown";
  readonly code: "google_drive_workspace_unknown";
}

export type GoogleDriveWorkspaceResolutionResult =
  | GoogleDriveApprovedWorkspaceResult
  | GoogleDriveRestrictedWorkspaceResult
  | GoogleDriveUnknownWorkspaceResult;

/** Resolves configured provider facts; it does not query Google Drive. */
export interface GoogleDriveWorkspaceResolver {
  resolve(workspaceId: string): Promise<GoogleDriveWorkspaceResolutionResult>;
}

export interface GoogleDriveApprovedWorkspaceConfiguration {
  readonly status: "approved";
  readonly workspaceId: string;
  readonly driveId: string;
  readonly rootFolderId: string;
  readonly metadata: GoogleDriveWorkspaceMetadata;
}

export interface GoogleDriveRestrictedWorkspaceConfiguration {
  readonly status: "restricted";
  readonly workspaceId: string;
  readonly metadata: GoogleDriveWorkspaceMetadata;
}

export type GoogleDriveWorkspaceConfiguration =
  | GoogleDriveApprovedWorkspaceConfiguration
  | GoogleDriveRestrictedWorkspaceConfiguration;

/** Future configuration sources must not infer drive IDs from workspace IDs. */
export interface GoogleDriveWorkspaceConfigurationSource {
  find(workspaceId: string): Promise<GoogleDriveWorkspaceConfiguration | null>;
}

export class ConfiguredGoogleDriveWorkspaceResolver
  implements GoogleDriveWorkspaceResolver
{
  public constructor(
    private readonly configurationSource: GoogleDriveWorkspaceConfigurationSource,
  ) {}

  public async resolve(
    workspaceId: string,
  ): Promise<GoogleDriveWorkspaceResolutionResult> {
    let configuration: GoogleDriveWorkspaceConfiguration | null;
    try {
      configuration = await this.configurationSource.find(workspaceId);
    } catch {
      return unknownResult(workspaceId);
    }

    if (configuration === null || configuration.workspaceId !== workspaceId) {
      return unknownResult(workspaceId);
    }

    if (configuration.status === "restricted") {
      return {
        status: "restricted",
        workspaceId,
        code: "google_drive_workspace_restricted",
        message: "Google Drive workspace mapping is restricted.",
        metadata: configuration.metadata,
      };
    }

    return {
      status: "approved",
      workspaceId,
      code: "google_drive_workspace_approved",
      message: "Google Drive workspace mapping is approved.",
      provider: "google_drive",
      driveId: configuration.driveId,
      rootFolderId: configuration.rootFolderId,
      metadata: configuration.metadata,
    };
  }
}

function unknownResult(workspaceId: string): GoogleDriveUnknownWorkspaceResult {
  return {
    status: "unknown",
    workspaceId,
    code: "google_drive_workspace_unknown",
    message: "Google Drive workspace mapping is unknown.",
    metadata: {},
  };
}
