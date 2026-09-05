import { describe, expect, it } from "vitest";

import {
  createGoogleDriveAuthorizedSession,
  SecureStoreGoogleDriveAuthProvider,
  type GoogleDriveAuthorizedSessionIssuer,
} from "../../../../src/ghost/integrations/google-drive/auth/google-drive.auth.js";
import {
  createAccountKey,
  createOpaqueAuthorizationState,
  type AccountKey,
  type OpaqueAuthorizationState,
  type SecureCredentialDeleteResult,
  type SecureCredentialLoadResult,
  type SecureCredentialSavedResult,
  type SecureCredentialStore,
} from "../../../../src/ghost/integrations/google-drive/auth/secure-credential-store.js";

const secretSentinel = "TEST_SECRET_SENTINEL";
const accountKey = createAccountKey("account-a");

class FakeSecureCredentialStore implements SecureCredentialStore {
  public readonly loadedKeys: AccountKey[] = [];
  public loadError: unknown = null;

  public constructor(
    private readonly authorizationState: OpaqueAuthorizationState | null,
  ) {}

  public load(requestedAccountKey: AccountKey): Promise<SecureCredentialLoadResult> {
    this.loadedKeys.push(requestedAccountKey);
    if (this.loadError !== null) return Promise.reject(this.loadError);
    if (this.authorizationState === null) {
      return Promise.resolve({
        status: "not_found",
        accountKey: requestedAccountKey,
        code: "secure_credential_not_found",
      });
    }
    return Promise.resolve({
      status: "found",
      accountKey: requestedAccountKey,
      code: "secure_credential_found",
      authorizationState: this.authorizationState,
    });
  }

  public save(
    requestedAccountKey: AccountKey,
    _authorizationState: OpaqueAuthorizationState,
  ): Promise<SecureCredentialSavedResult> {
    return Promise.resolve({
      status: "saved",
      accountKey: requestedAccountKey,
      code: "secure_credential_saved",
    });
  }

  public delete(
    requestedAccountKey: AccountKey,
  ): Promise<SecureCredentialDeleteResult> {
    return Promise.resolve({
      status: "not_found",
      accountKey: requestedAccountKey,
      code: "secure_credential_not_found",
    });
  }
}

class FakeSessionIssuer implements GoogleDriveAuthorizedSessionIssuer {
  public readonly calls: Readonly<{
    accountKey: AccountKey;
    authorizationState: OpaqueAuthorizationState;
  }>[] = [];
  public thrownError: unknown = null;

  public issue(
    requestedAccountKey: AccountKey,
    authorizationState: OpaqueAuthorizationState,
  ) {
    this.calls.push({ accountKey: requestedAccountKey, authorizationState });
    if (this.thrownError !== null) return Promise.reject(this.thrownError);
    return Promise.resolve(createGoogleDriveAuthorizedSession("session-ref-a"));
  }
}

describe("A3 GoogleDriveAuthProvider", () => {
  it("returns authorized from stored state without exposing authorization material", async () => {
    const state = createOpaqueAuthorizationState(secretSentinel);
    const store = new FakeSecureCredentialStore(state);
    const issuer = new FakeSessionIssuer();
    const result = await new SecureStoreGoogleDriveAuthProvider(
      store,
      issuer,
    ).authorize(accountKey);

    expect(result).toEqual({
      status: "authorized",
      accountKey,
      code: "google_drive_authorized",
      message: "Google Drive account is authorized.",
      session: createGoogleDriveAuthorizedSession("session-ref-a"),
      metadata: { authorizationMode: "user_delegated" },
    });
    expect(store.loadedKeys).toEqual([accountKey]);
    expect(issuer.calls).toEqual([{ accountKey, authorizationState: state }]);
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
  });

  it("returns authorization_required when no stored authorization exists", async () => {
    const store = new FakeSecureCredentialStore(null);
    const issuer = new FakeSessionIssuer();
    const result = await new SecureStoreGoogleDriveAuthProvider(
      store,
      issuer,
    ).authorize(accountKey);

    expect(result).toEqual({
      status: "authorization_required",
      accountKey,
      code: "google_drive_authorization_required",
      message: "Google Drive authorization is required.",
      metadata: {},
    });
    expect(issuer.calls).toHaveLength(0);
  });

  it("returns unavailable with a redacted stable result when secure loading fails", async () => {
    const store = new FakeSecureCredentialStore(null);
    store.loadError = new Error(secretSentinel);
    const issuer = new FakeSessionIssuer();
    const result = await new SecureStoreGoogleDriveAuthProvider(
      store,
      issuer,
    ).authorize(accountKey);

    expect(result).toEqual({
      status: "unavailable",
      accountKey,
      code: "google_drive_auth_unavailable",
      message: "Google Drive authorization is unavailable.",
      metadata: {},
    });
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
    expect(issuer.calls).toHaveLength(0);
  });

  it("returns invalid_configuration when no secure credential store is configured", async () => {
    const issuer = new FakeSessionIssuer();
    const result = await new SecureStoreGoogleDriveAuthProvider(
      null,
      issuer,
    ).authorize(accountKey);

    expect(result).toEqual({
      status: "invalid_configuration",
      accountKey,
      code: "google_drive_auth_invalid_configuration",
      message: "Google Drive authorization configuration is invalid.",
      metadata: {},
    });
    expect(issuer.calls).toHaveLength(0);
  });

  it("redacts session issuer failures and does not retry", async () => {
    const state = createOpaqueAuthorizationState(secretSentinel);
    const issuer = new FakeSessionIssuer();
    issuer.thrownError = new Error(secretSentinel);
    const result = await new SecureStoreGoogleDriveAuthProvider(
      new FakeSecureCredentialStore(state),
      issuer,
    ).authorize(accountKey);

    expect(result.status).toBe("unavailable");
    expect(issuer.calls).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
  });

  it("keeps the controlled authorized session safe for serialization and inspection", () => {
    const session = createGoogleDriveAuthorizedSession("  session-ref-a  ");
    const inspect = Reflect.get(
      session,
      Symbol.for("nodejs.util.inspect.custom"),
    );
    if (typeof inspect !== "function") {
      throw new Error("Expected a safe custom inspection function.");
    }

    expect(session.sessionReference).toBe("session-ref-a");
    expect(Object.isFrozen(session)).toBe(true);
    expect(Object.keys(session).sort()).toEqual(["kind", "sessionReference"]);
    expect(JSON.stringify(session)).toBe(
      '{"kind":"google_drive_authorized_session","sessionReference":"session-ref-a"}',
    );
    expect({ ...session }).toEqual({
      kind: "google_drive_authorized_session",
      sessionReference: "session-ref-a",
    });
    expect(String(session)).toBe("[GoogleDriveAuthorizedSession]");
    expect(JSON.stringify(Reflect.apply(inspect, session, []))).not.toContain(
      secretSentinel,
    );
    expect(JSON.stringify(session)).not.toContain(secretSentinel);
    expect(JSON.stringify({ ...session })).not.toContain(secretSentinel);
    expect(String(session)).not.toContain(secretSentinel);
  });

  it("rejects an empty authorized session reference", () => {
    expect(() => createGoogleDriveAuthorizedSession("   ")).toThrow(
      "Authorized session reference must be non-empty.",
    );
  });
});
