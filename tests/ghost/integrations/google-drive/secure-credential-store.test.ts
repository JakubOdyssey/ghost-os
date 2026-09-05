import { describe, expect, it } from "vitest";

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

class InMemorySecureCredentialStore implements SecureCredentialStore {
  private readonly states = new Map<AccountKey, OpaqueAuthorizationState>();

  public load(accountKey: AccountKey): Promise<SecureCredentialLoadResult> {
    const authorizationState = this.states.get(accountKey);
    if (authorizationState === undefined) {
      return Promise.resolve({
        status: "not_found",
        accountKey,
        code: "secure_credential_not_found",
      });
    }
    return Promise.resolve({
      status: "found",
      accountKey,
      code: "secure_credential_found",
      authorizationState,
    });
  }

  public save(
    accountKey: AccountKey,
    authorizationState: OpaqueAuthorizationState,
  ): Promise<SecureCredentialSavedResult> {
    this.states.set(accountKey, authorizationState);
    return Promise.resolve({
      status: "saved",
      accountKey,
      code: "secure_credential_saved",
    });
  }

  public delete(accountKey: AccountKey): Promise<SecureCredentialDeleteResult> {
    if (!this.states.delete(accountKey)) {
      return Promise.resolve({
        status: "not_found",
        accountKey,
        code: "secure_credential_not_found",
      });
    }
    return Promise.resolve({
      status: "deleted",
      accountKey,
      code: "secure_credential_deleted",
    });
  }
}

describe("A3 SecureCredentialStore boundary", () => {
  it("saves and loads opaque authorization state", async () => {
    const store = new InMemorySecureCredentialStore();
    const accountKey = createAccountKey("account-a");
    const state = createOpaqueAuthorizationState(secretSentinel);

    expect(await store.save(accountKey, state)).toEqual({
      status: "saved",
      accountKey,
      code: "secure_credential_saved",
    });

    const loaded = await store.load(accountKey);
    expect(loaded.status).toBe("found");
    if (loaded.status === "found") {
      expect(loaded.authorizationState).toBe(state);
    }
  });

  it("deletes stored state deterministically", async () => {
    const store = new InMemorySecureCredentialStore();
    const accountKey = createAccountKey("account-a");
    await store.save(
      accountKey,
      createOpaqueAuthorizationState(secretSentinel),
    );

    expect(await store.delete(accountKey)).toEqual({
      status: "deleted",
      accountKey,
      code: "secure_credential_deleted",
    });
    expect(await store.load(accountKey)).toEqual({
      status: "not_found",
      accountKey,
      code: "secure_credential_not_found",
    });
    expect(await store.delete(accountKey)).toEqual({
      status: "not_found",
      accountKey,
      code: "secure_credential_not_found",
    });
  });

  it("isolates different logical account keys", async () => {
    const store = new InMemorySecureCredentialStore();
    const accountA = createAccountKey("account-a");
    const accountB = createAccountKey("account-b");
    const first = createOpaqueAuthorizationState("first-private-value");
    const second = createOpaqueAuthorizationState("second-private-value");
    await store.save(accountA, first);
    await store.save(accountB, second);

    const loadedA = await store.load(accountA);
    const loadedB = await store.load(accountB);
    expect(loadedA.status === "found" && loadedA.authorizationState).toBe(first);
    expect(loadedB.status === "found" && loadedB.authorizationState).toBe(second);
  });

  it("does not reveal opaque values through public result serialization", async () => {
    const store = new InMemorySecureCredentialStore();
    const accountKey = createAccountKey("account-a");
    const state = createOpaqueAuthorizationState(secretSentinel);
    await store.save(
      accountKey,
      state,
    );
    const loaded = await store.load(accountKey);

    expect(JSON.stringify(state)).toBe(
      '{"kind":"opaque_authorization_state"}',
    );
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.keys(state)).toEqual(["kind"]);
    expect(Reflect.ownKeys(state)).toEqual(["kind"]);
    expect(Reflect.set(state, "refreshToken", secretSentinel)).toBe(false);
    expect(Reflect.has(state, "refreshToken")).toBe(false);
    expect(JSON.stringify({ ...state })).toBe(
      '{"kind":"opaque_authorization_state"}',
    );
    expect(String(state)).toBe("[OpaqueAuthorizationState]");
    expect(JSON.stringify(state)).not.toContain(secretSentinel);
    expect(JSON.stringify({ ...state })).not.toContain(secretSentinel);
    expect(String(state)).not.toContain(secretSentinel);
    expect(JSON.stringify(loaded)).toBe(
      '{"status":"found","accountKey":"account-a","code":"secure_credential_found","authorizationState":{"kind":"opaque_authorization_state"}}',
    );
    expect(JSON.stringify(loaded)).not.toContain(secretSentinel);
    expect(Object.keys(loaded)).not.toContain("credentials");
  });

  it("returns identical public results for identical operations", async () => {
    const firstStore = new InMemorySecureCredentialStore();
    const secondStore = new InMemorySecureCredentialStore();
    const accountKey = createAccountKey("account-a");
    const first = await firstStore.save(
      accountKey,
      createOpaqueAuthorizationState("private-a"),
    );
    const second = await secondStore.save(
      accountKey,
      createOpaqueAuthorizationState("private-b"),
    );
    expect(second).toEqual(first);
  });

  it("rejects empty account keys at the controlled construction boundary", () => {
    expect(() => createAccountKey("")).toThrow(
      "Account key must be a non-empty value.",
    );
    expect(() => createAccountKey("   ")).toThrow(
      "Account key must be a non-empty value.",
    );
    expect(createAccountKey("account-a")).toBe("account-a");
    expect(createAccountKey("  account-a\t")).toBe("account-a");
    expect(createAccountKey("account-a")).toBe(
      createAccountKey(" \naccount-a\r\n"),
    );
  });

  it("does not allow callers to structurally forge opaque authorization state", () => {
    // @ts-expect-error The unexported nominal brand prevents structural creation.
    const forgedState: OpaqueAuthorizationState = {
      kind: "opaque_authorization_state",
      toJSON: () => ({ kind: "opaque_authorization_state" }),
    };

    expect(forgedState.kind).toBe("opaque_authorization_state");
  });

  it("does not accept workspace or request identifiers as AccountKey", () => {
    const store = new InMemorySecureCredentialStore();
    const workspaceId: string = "workspace-a";
    const requestId: string = "request-a";

    // @ts-expect-error A workspace ID cannot satisfy the AccountKey brand.
    const workspaceAsAccountKey: AccountKey = workspaceId;
    // @ts-expect-error A request ID cannot satisfy the AccountKey brand.
    const requestAsAccountKey: AccountKey = requestId;
    // @ts-expect-error Store operations require a validated AccountKey.
    void store.load(workspaceId);
    // @ts-expect-error Store operations require a validated AccountKey.
    void store.delete(requestId);

    expect(workspaceId).toBe("workspace-a");
    expect(requestId).toBe("request-a");
  });
});
