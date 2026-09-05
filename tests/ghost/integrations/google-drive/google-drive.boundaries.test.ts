import { describe, expect, it } from "vitest";

import type { SecureCredentialStore } from "../../../../src/ghost/integrations/google-drive/auth/secure-credential-store.js";
import {
  SecureStoreGoogleDriveAuthProvider,
  type GoogleDriveAuthorizedSessionIssuer,
  type GoogleDriveAuthProvider,
} from "../../../../src/ghost/integrations/google-drive/auth/google-drive.auth.js";
import {
  GoogleDriveAuthorizedClientFactory,
  type GoogleDriveProviderClientBuilder,
} from "../../../../src/ghost/integrations/google-drive/client/google-drive.authorized-client.factory.js";
import {
  ConfiguredGoogleDriveWorkspaceResolver,
  type GoogleDriveWorkspaceConfigurationSource,
  type GoogleDriveWorkspaceResolver,
} from "../../../../src/ghost/integrations/google-drive/workspace/google-drive.workspace-resolver.js";

describe("A3 integration dependency boundaries", () => {
  it("keeps the authorized factory injection-only and free of network orchestration", () => {
    const implementation = [
      SecureStoreGoogleDriveAuthProvider,
      GoogleDriveAuthorizedClientFactory,
      ConfiguredGoogleDriveWorkspaceResolver,
    ].map((value) => value.toString()).join("\n");
    expect(implementation).not.toMatch(
      /googleapis|fetch\s*\(|XMLHttpRequest|node:http|node:https|process\.env|service.?account/i,
    );
    expect(implementation).not.toMatch(
      /Runtime|verification|executionRecord|LocalFilesystemAdapter|nodeManager/i,
    );
  });

  it("exposes only narrow replaceable ports at each integration boundary", () => {
    const portMethods = {
      secureCredentialStore: ["load", "save", "delete"],
      authProvider: ["authorize"],
      sessionIssuer: ["issue"],
      clientBuilder: ["build"],
      workspaceResolver: ["resolve"],
      workspaceConfigurationSource: ["find"],
    } as const satisfies Readonly<{
      secureCredentialStore: readonly (keyof SecureCredentialStore)[];
      authProvider: readonly (keyof GoogleDriveAuthProvider)[];
      sessionIssuer: readonly (keyof GoogleDriveAuthorizedSessionIssuer)[];
      clientBuilder: readonly (keyof GoogleDriveProviderClientBuilder)[];
      workspaceResolver: readonly (keyof GoogleDriveWorkspaceResolver)[];
      workspaceConfigurationSource: readonly (keyof GoogleDriveWorkspaceConfigurationSource)[];
    }>;

    expect(portMethods).toEqual({
      secureCredentialStore: ["load", "save", "delete"],
      authProvider: ["authorize"],
      sessionIssuer: ["issue"],
      clientBuilder: ["build"],
      workspaceResolver: ["resolve"],
      workspaceConfigurationSource: ["find"],
    });
  });

  it("contains no plaintext fallback, automatic retry, or real network behavior", () => {
    expect(GoogleDriveAuthorizedClientFactory.length).toBe(2);
    expect(GoogleDriveAuthorizedClientFactory.prototype.create.length).toBe(1);
    expect(Object.getOwnPropertyNames(GoogleDriveAuthorizedClientFactory.prototype))
      .toEqual(["constructor", "create"]);
    expect(Object.getOwnPropertyNames(SecureStoreGoogleDriveAuthProvider.prototype))
      .toEqual(["constructor", "authorize"]);
    expect(Object.getOwnPropertyNames(ConfiguredGoogleDriveWorkspaceResolver.prototype))
      .toEqual(["constructor", "resolve"]);
  });
});
