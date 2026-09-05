declare const accountKeyBrand: unique symbol;

export type AccountKey = string & {
  readonly [accountKeyBrand]: true;
};

export function createAccountKey(value: string): AccountKey {
  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    throw new Error("Account key must be a non-empty value.");
  }
  return normalizedValue as AccountKey;
}

declare const opaqueAuthorizationStateBrand: unique symbol;
const nodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

export interface OpaqueAuthorizationStateSerialization {
  readonly kind: "opaque_authorization_state";
}

/**
 * An authorization state may carry sensitive material internally, but its
 * required serialization exposes only a non-sensitive marker.
 */
export interface OpaqueAuthorizationState {
  readonly [opaqueAuthorizationStateBrand]: true;
  readonly kind: "opaque_authorization_state";
  toJSON(): OpaqueAuthorizationStateSerialization;
}

class OpaqueAuthorizationStateImplementation
  implements OpaqueAuthorizationState
{
  readonly #authorizationMaterial: unknown;

  declare readonly [opaqueAuthorizationStateBrand]: true;
  public readonly kind = "opaque_authorization_state";

  public constructor(authorizationMaterial: unknown) {
    this.#authorizationMaterial = authorizationMaterial;
    Object.freeze(this);
  }

  public toJSON(): OpaqueAuthorizationStateSerialization {
    return { kind: "opaque_authorization_state" };
  }

  public toString(): string {
    return "[OpaqueAuthorizationState]";
  }

  public [nodeInspectSymbol](): OpaqueAuthorizationStateSerialization {
    return this.toJSON();
  }
}

export function createOpaqueAuthorizationState(
  authorizationMaterial: unknown,
): OpaqueAuthorizationState {
  return new OpaqueAuthorizationStateImplementation(authorizationMaterial);
}

export interface SecureCredentialFoundResult {
  readonly status: "found";
  readonly accountKey: AccountKey;
  readonly code: "secure_credential_found";
  readonly authorizationState: OpaqueAuthorizationState;
}

export interface SecureCredentialNotFoundResult {
  readonly status: "not_found";
  readonly accountKey: AccountKey;
  readonly code: "secure_credential_not_found";
}

export type SecureCredentialLoadResult =
  | SecureCredentialFoundResult
  | SecureCredentialNotFoundResult;

export interface SecureCredentialSavedResult {
  readonly status: "saved";
  readonly accountKey: AccountKey;
  readonly code: "secure_credential_saved";
}

export interface SecureCredentialDeletedResult {
  readonly status: "deleted";
  readonly accountKey: AccountKey;
  readonly code: "secure_credential_deleted";
}

export interface SecureCredentialDeleteNotFoundResult {
  readonly status: "not_found";
  readonly accountKey: AccountKey;
  readonly code: "secure_credential_not_found";
}

export type SecureCredentialDeleteResult =
  | SecureCredentialDeletedResult
  | SecureCredentialDeleteNotFoundResult;

/** Production configuration must supply a secure implementation. */
export interface SecureCredentialStore {
  load(accountKey: AccountKey): Promise<SecureCredentialLoadResult>;
  save(
    accountKey: AccountKey,
    authorizationState: OpaqueAuthorizationState,
  ): Promise<SecureCredentialSavedResult>;
  delete(accountKey: AccountKey): Promise<SecureCredentialDeleteResult>;
}
