import type { GoogleDriveClientPort } from "../../../capabilities/filesystem/google-drive/google-drive.client.js";
import type {
  GoogleDriveAuthorizedSession,
  GoogleDriveAuthProvider,
  GoogleDrivePublicMetadata,
} from "../auth/google-drive.auth.js";
import type { AccountKey } from "../auth/secure-credential-store.js";

export interface GoogleDriveProviderClientBuilder {
  build(session: GoogleDriveAuthorizedSession): Promise<GoogleDriveClientPort>;
}

interface GoogleDriveAuthorizedClientResultContext {
  readonly accountKey: AccountKey;
  readonly message: string;
  readonly metadata: GoogleDrivePublicMetadata;
}

export interface GoogleDriveAuthorizedClientReadyResult
  extends GoogleDriveAuthorizedClientResultContext {
  readonly status: "ready";
  readonly code: "google_drive_client_ready";
  readonly client: GoogleDriveClientPort;
}

export interface GoogleDriveAuthorizedClientAuthorizationRequiredResult
  extends GoogleDriveAuthorizedClientResultContext {
  readonly status: "authorization_required";
  readonly code: "google_drive_authorization_required";
}

export interface GoogleDriveAuthorizedClientUnavailableResult
  extends GoogleDriveAuthorizedClientResultContext {
  readonly status: "unavailable";
  readonly code: "google_drive_auth_unavailable";
}

export interface GoogleDriveAuthorizedClientInvalidConfigurationResult
  extends GoogleDriveAuthorizedClientResultContext {
  readonly status: "invalid_configuration";
  readonly code: "google_drive_auth_invalid_configuration";
}

export interface GoogleDriveAuthorizedClientCreationFailedResult
  extends GoogleDriveAuthorizedClientResultContext {
  readonly status: "client_creation_failed";
  readonly code: "google_drive_client_creation_failed";
}

export type GoogleDriveAuthorizedClientFactoryResult =
  | GoogleDriveAuthorizedClientReadyResult
  | GoogleDriveAuthorizedClientAuthorizationRequiredResult
  | GoogleDriveAuthorizedClientUnavailableResult
  | GoogleDriveAuthorizedClientInvalidConfigurationResult
  | GoogleDriveAuthorizedClientCreationFailedResult;

export class GoogleDriveAuthorizedClientFactory {
  public constructor(
    private readonly authProvider: GoogleDriveAuthProvider,
    private readonly clientBuilder: GoogleDriveProviderClientBuilder,
  ) {}

  public async create(
    accountKey: AccountKey,
  ): Promise<GoogleDriveAuthorizedClientFactoryResult> {
    let authorization;
    try {
      authorization = await this.authProvider.authorize(accountKey);
    } catch {
      return {
        status: "unavailable",
        accountKey,
        code: "google_drive_auth_unavailable",
        message: "Google Drive authorization is unavailable.",
        metadata: {},
      };
    }

    switch (authorization.status) {
      case "authorization_required":
        return {
          status: "authorization_required",
          accountKey,
          code: "google_drive_authorization_required",
          message: "Google Drive authorization is required.",
          metadata: {},
        };
      case "unavailable":
        return {
          status: "unavailable",
          accountKey,
          code: "google_drive_auth_unavailable",
          message: "Google Drive authorization is unavailable.",
          metadata: {},
        };
      case "invalid_configuration":
        return {
          status: "invalid_configuration",
          accountKey,
          code: "google_drive_auth_invalid_configuration",
          message: "Google Drive authorization configuration is invalid.",
          metadata: {},
        };
      case "authorized":
        try {
          const client = await this.clientBuilder.build(authorization.session);
          return {
            status: "ready",
            accountKey,
            code: "google_drive_client_ready",
            message: "Authorized Google Drive client is ready.",
            client,
            metadata: {},
          };
        } catch {
          return {
            status: "client_creation_failed",
            accountKey,
            code: "google_drive_client_creation_failed",
            message: "Authorized Google Drive client creation failed.",
            metadata: {},
          };
        }
    }
  }
}
