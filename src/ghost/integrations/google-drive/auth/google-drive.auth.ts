import type {
  AccountKey,
  OpaqueAuthorizationState,
  SecureCredentialStore,
} from "./secure-credential-store.js";

export type GoogleDrivePublicMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

export interface GoogleDriveAuthorizedSessionSerialization {
  readonly kind: "google_drive_authorized_session";
  readonly sessionReference: string;
}

declare const googleDriveAuthorizedSessionBrand: unique symbol;
const nodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

/** A non-sensitive reference consumed only by an authorized client builder. */
export interface GoogleDriveAuthorizedSession {
  readonly [googleDriveAuthorizedSessionBrand]: true;
  readonly kind: "google_drive_authorized_session";
  readonly sessionReference: string;
  toJSON(): GoogleDriveAuthorizedSessionSerialization;
}

class GoogleDriveAuthorizedSessionImplementation
  implements GoogleDriveAuthorizedSession
{
  declare readonly [googleDriveAuthorizedSessionBrand]: true;
  public readonly kind = "google_drive_authorized_session";

  public constructor(public readonly sessionReference: string) {
    Object.freeze(this);
  }

  public toJSON(): GoogleDriveAuthorizedSessionSerialization {
    return {
      kind: "google_drive_authorized_session",
      sessionReference: this.sessionReference,
    };
  }

  public toString(): string {
    return "[GoogleDriveAuthorizedSession]";
  }

  public [nodeInspectSymbol](): GoogleDriveAuthorizedSessionSerialization {
    return this.toJSON();
  }
}

export function createGoogleDriveAuthorizedSession(
  sessionReference: string,
): GoogleDriveAuthorizedSession {
  const normalizedReference = sessionReference.trim();
  if (normalizedReference.length === 0) {
    throw new Error("Authorized session reference must be non-empty.");
  }
  return new GoogleDriveAuthorizedSessionImplementation(normalizedReference);
}

/** Creates a safe session reference inside the authorization boundary. */
export interface GoogleDriveAuthorizedSessionIssuer {
  issue(
    accountKey: AccountKey,
    authorizationState: OpaqueAuthorizationState,
  ): Promise<GoogleDriveAuthorizedSession>;
}

interface GoogleDriveAuthResultContext {
  readonly accountKey: AccountKey;
  readonly message: string;
  readonly metadata: GoogleDrivePublicMetadata;
}

export interface GoogleDriveAuthorizedResult
  extends GoogleDriveAuthResultContext {
  readonly status: "authorized";
  readonly code: "google_drive_authorized";
  readonly session: GoogleDriveAuthorizedSession;
}

export interface GoogleDriveAuthorizationRequiredResult
  extends GoogleDriveAuthResultContext {
  readonly status: "authorization_required";
  readonly code: "google_drive_authorization_required";
}

export interface GoogleDriveAuthUnavailableResult
  extends GoogleDriveAuthResultContext {
  readonly status: "unavailable";
  readonly code: "google_drive_auth_unavailable";
}

export interface GoogleDriveAuthInvalidConfigurationResult
  extends GoogleDriveAuthResultContext {
  readonly status: "invalid_configuration";
  readonly code: "google_drive_auth_invalid_configuration";
}

export type GoogleDriveAuthResult =
  | GoogleDriveAuthorizedResult
  | GoogleDriveAuthorizationRequiredResult
  | GoogleDriveAuthUnavailableResult
  | GoogleDriveAuthInvalidConfigurationResult;

/** User-delegated authorization boundary; it never returns raw credentials. */
export interface GoogleDriveAuthProvider {
  authorize(accountKey: AccountKey): Promise<GoogleDriveAuthResult>;
}

/**
 * Resolves stored user-delegated authorization into an opaque session without
 * exposing credential material to callers.
 */
export class SecureStoreGoogleDriveAuthProvider
  implements GoogleDriveAuthProvider
{
  public constructor(
    private readonly credentialStore: SecureCredentialStore | null,
    private readonly sessionIssuer: GoogleDriveAuthorizedSessionIssuer,
  ) {}

  public async authorize(accountKey: AccountKey): Promise<GoogleDriveAuthResult> {
    if (this.credentialStore === null) {
      return invalidConfigurationResult(accountKey);
    }

    let credentialResult;
    try {
      credentialResult = await this.credentialStore.load(accountKey);
    } catch {
      return unavailableResult(accountKey);
    }

    if (credentialResult.status === "not_found") {
      return {
        status: "authorization_required",
        accountKey,
        code: "google_drive_authorization_required",
        message: "Google Drive authorization is required.",
        metadata: {},
      };
    }

    try {
      const session = await this.sessionIssuer.issue(
        accountKey,
        credentialResult.authorizationState,
      );
      return {
        status: "authorized",
        accountKey,
        code: "google_drive_authorized",
        message: "Google Drive account is authorized.",
        session,
        metadata: { authorizationMode: "user_delegated" },
      };
    } catch {
      return unavailableResult(accountKey);
    }
  }
}

function unavailableResult(accountKey: AccountKey): GoogleDriveAuthUnavailableResult {
  return {
    status: "unavailable",
    accountKey,
    code: "google_drive_auth_unavailable",
    message: "Google Drive authorization is unavailable.",
    metadata: {},
  };
}

function invalidConfigurationResult(
  accountKey: AccountKey,
): GoogleDriveAuthInvalidConfigurationResult {
  return {
    status: "invalid_configuration",
    accountKey,
    code: "google_drive_auth_invalid_configuration",
    message: "Google Drive authorization configuration is invalid.",
    metadata: {},
  };
}
