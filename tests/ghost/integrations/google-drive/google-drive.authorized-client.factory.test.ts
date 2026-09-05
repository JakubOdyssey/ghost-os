import { describe, expect, it } from "vitest";

import type {
  GoogleDriveClientPort,
  GoogleDriveCopyInput,
  GoogleDriveCreateDocumentInput,
  GoogleDriveCreateFolderInput,
  GoogleDriveMoveInput,
  GoogleDriveRenameInput,
  GoogleDriveRenameResult,
  GoogleDriveResourceRecord,
  GoogleDriveSearchInput,
} from "../../../../src/ghost/capabilities/filesystem/google-drive/google-drive.client.js";
import type {
  GoogleDriveAuthorizedSession,
  GoogleDriveAuthProvider,
  GoogleDriveAuthResult,
} from "../../../../src/ghost/integrations/google-drive/auth/google-drive.auth.js";
import { createGoogleDriveAuthorizedSession } from "../../../../src/ghost/integrations/google-drive/auth/google-drive.auth.js";
import {
  createAccountKey,
  type AccountKey,
} from "../../../../src/ghost/integrations/google-drive/auth/secure-credential-store.js";
import {
  GoogleDriveAuthorizedClientFactory,
  type GoogleDriveProviderClientBuilder,
} from "../../../../src/ghost/integrations/google-drive/client/google-drive.authorized-client.factory.js";

const secretSentinel = "TEST_SECRET_SENTINEL";
const accountKey = createAccountKey("account-a");

const resource: GoogleDriveResourceRecord = {
  id: "fake-resource",
  name: "Fake resource",
  mimeType: "application/octet-stream",
  parentIds: ["fake-parent"],
  webViewLink: null,
  providerMetadata: {},
};

class DeterministicClient implements GoogleDriveClientPort {
  public search(
    _input: GoogleDriveSearchInput,
  ): Promise<readonly GoogleDriveResourceRecord[]> {
    return Promise.resolve([resource]);
  }

  public createFolder(
    _input: GoogleDriveCreateFolderInput,
  ): Promise<GoogleDriveResourceRecord> {
    return Promise.resolve(resource);
  }

  public createDocument(
    _input: GoogleDriveCreateDocumentInput,
  ): Promise<GoogleDriveResourceRecord> {
    return Promise.resolve(resource);
  }

  public copy(_input: GoogleDriveCopyInput): Promise<GoogleDriveResourceRecord> {
    return Promise.resolve(resource);
  }

  public rename(
    _input: GoogleDriveRenameInput,
  ): Promise<GoogleDriveRenameResult> {
    return Promise.resolve({ resource, previousName: "Previous name" });
  }

  public move(_input: GoogleDriveMoveInput): Promise<GoogleDriveResourceRecord> {
    return Promise.resolve(resource);
  }
}

class FakeAuthProvider implements GoogleDriveAuthProvider {
  public readonly accountKeys: AccountKey[] = [];
  public thrownError: unknown = null;

  public constructor(public result: GoogleDriveAuthResult) {}

  public authorize(requestedAccountKey: AccountKey): Promise<GoogleDriveAuthResult> {
    this.accountKeys.push(requestedAccountKey);
    if (this.thrownError !== null) return Promise.reject(this.thrownError);
    return Promise.resolve(this.result);
  }
}

class FakeClientBuilder implements GoogleDriveProviderClientBuilder {
  public readonly sessions: GoogleDriveAuthorizedSession[] = [];
  public thrownError: unknown = null;

  public constructor(public readonly client: GoogleDriveClientPort) {}

  public build(
    session: GoogleDriveAuthorizedSession,
  ): Promise<GoogleDriveClientPort> {
    this.sessions.push(session);
    if (this.thrownError !== null) return Promise.reject(this.thrownError);
    return Promise.resolve(this.client);
  }
}

describe("A3 GoogleDriveAuthorizedClientFactory", () => {
  it("creates exactly one compatible client from an authorized session", async () => {
    const session = createGoogleDriveAuthorizedSession("session-ref-a");
    const client: GoogleDriveClientPort = new DeterministicClient();
    const authProvider = authorizedProvider(session);
    const builder = new FakeClientBuilder(client);
    const factory = new GoogleDriveAuthorizedClientFactory(authProvider, builder);

    const result = await factory.create(accountKey);

    expect(result).toEqual({
      status: "ready",
      accountKey,
      code: "google_drive_client_ready",
      message: "Authorized Google Drive client is ready.",
      client,
      metadata: {},
    });
    expect(authProvider.accountKeys).toEqual([accountKey]);
    expect(builder.sessions).toEqual([session]);
    if (result.status === "ready") {
      expect(await result.client.search({ workspaceId: "w", query: "q" })).toEqual([
        resource,
      ]);
    }
  });

  it.each([
    {
      status: "authorization_required",
      accountKey,
      code: "google_drive_authorization_required",
      message: "Google Drive authorization is required.",
      metadata: {},
    },
    {
      status: "unavailable",
      accountKey,
      code: "google_drive_auth_unavailable",
      message: "Google Drive authorization is unavailable.",
      metadata: {},
    },
    {
      status: "invalid_configuration",
      accountKey,
      code: "google_drive_auth_invalid_configuration",
      message: "Google Drive authorization configuration is invalid.",
      metadata: {},
    },
  ] satisfies readonly GoogleDriveAuthResult[])(
    "preserves $status without creating a client",
    async (authResult) => {
      const authProvider = new FakeAuthProvider(authResult);
      const builder = new FakeClientBuilder(new DeterministicClient());
      const result = await new GoogleDriveAuthorizedClientFactory(
        authProvider,
        builder,
      ).create(accountKey);

      expect(result).toEqual({ ...authResult, metadata: {} });
      expect(authProvider.accountKeys).toEqual([accountKey]);
      expect(builder.sessions).toHaveLength(0);
    },
  );

  it("returns a redacted client_creation_failed result without retrying", async () => {
    const session = createGoogleDriveAuthorizedSession("session-ref-a");
    const authProvider = authorizedProvider(session);
    const builder = new FakeClientBuilder(new DeterministicClient());
    builder.thrownError = new Error(secretSentinel);

    const result = await new GoogleDriveAuthorizedClientFactory(
      authProvider,
      builder,
    ).create(accountKey);

    expect(result).toEqual({
      status: "client_creation_failed",
      accountKey,
      code: "google_drive_client_creation_failed",
      message: "Authorized Google Drive client creation failed.",
      metadata: {},
    });
    expect(builder.sessions).toEqual([session]);
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
    expect(result.message).not.toContain(secretSentinel);
    expect(result).not.toHaveProperty("session");
    expect(result).not.toHaveProperty("client");
  });

  it("replaces unsafe auth-provider failure details with a stable public result", async () => {
    const authProvider = new FakeAuthProvider({
      status: "unavailable",
      accountKey,
      code: "google_drive_auth_unavailable",
      message: secretSentinel,
      metadata: { unsafeDetail: secretSentinel },
    });
    const builder = new FakeClientBuilder(new DeterministicClient());

    const result = await new GoogleDriveAuthorizedClientFactory(
      authProvider,
      builder,
    ).create(accountKey);

    expect(result).toEqual({
      status: "unavailable",
      accountKey,
      code: "google_drive_auth_unavailable",
      message: "Google Drive authorization is unavailable.",
      metadata: {},
    });
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
    expect(builder.sessions).toHaveLength(0);
  });

  it("redacts an authorization provider exception and performs no retry", async () => {
    const authProvider = authorizedProvider(
      createGoogleDriveAuthorizedSession("session-ref-a"),
    );
    authProvider.thrownError = new Error(secretSentinel);
    const builder = new FakeClientBuilder(new DeterministicClient());

    const result = await new GoogleDriveAuthorizedClientFactory(
      authProvider,
      builder,
    ).create(accountKey);

    expect(result).toEqual({
      status: "unavailable",
      accountKey,
      code: "google_drive_auth_unavailable",
      message: "Google Drive authorization is unavailable.",
      metadata: {},
    });
    expect(authProvider.accountKeys).toEqual([accountKey]);
    expect(builder.sessions).toHaveLength(0);
    expect(JSON.stringify(result)).not.toContain(secretSentinel);
  });

  it("returns deterministic public output for deterministic fakes", async () => {
    const session = createGoogleDriveAuthorizedSession("session-ref-a");
    const client = new DeterministicClient();
    const first = await new GoogleDriveAuthorizedClientFactory(
      authorizedProvider(session),
      new FakeClientBuilder(client),
    ).create(accountKey);
    const second = await new GoogleDriveAuthorizedClientFactory(
      authorizedProvider(session),
      new FakeClientBuilder(client),
    ).create(accountKey);
    expect(second).toEqual(first);
  });

  it("defines exactly the five factory result states", () => {
    const statuses = [
      "ready",
      "authorization_required",
      "unavailable",
      "invalid_configuration",
      "client_creation_failed",
    ] as const;
    expect(statuses).toEqual([
      "ready",
      "authorization_required",
      "unavailable",
      "invalid_configuration",
      "client_creation_failed",
    ]);
  });
});

function authorizedProvider(
  session: GoogleDriveAuthorizedSession,
): FakeAuthProvider {
  return new FakeAuthProvider({
    status: "authorized",
    accountKey,
    code: "google_drive_authorized",
    message: "Google Drive account is authorized.",
    session,
    metadata: {},
  });
}
