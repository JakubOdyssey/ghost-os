# Policy Engine Architecture

## Status

This document records ADR-0005 and ADR-0006 as the current Policy Engine direction. The Policy Engine foundation is not yet implemented.

## Central Policy Engine

Ghost uses one central, capability-independent Policy Engine. Capability-specific security modules such as `filesystem.security.ts` are prohibited.

The canonical Policy Engine location is:

`src/ghost/core/policy/`

The obsolete `src/ghost/policy/` location must not be used.

## Canonical shared types

Ghost Core owns these canonical shared types:

- `RiskClass`
- `ConfirmationLevel`

Their canonical declaration location is:

`src/ghost/core/policy/policy.types.ts`

Capability contracts must reuse these types rather than redeclaring them.

## Dependency direction

Allowed:

```text
filesystem capability ──type-only import──> Ghost Core policy types
other capabilities    ──type-only import──> Ghost Core policy types
```

Prohibited:

```text
Ghost Core Policy Engine ──X──> filesystem capability
Ghost Core Policy Engine ──X──> any other capability
```

Ghost Core must remain capability-independent, provider-independent, interface-independent, and node-ready.

## Adapter gate

`GoogleDriveFilesystemAdapter` must not begin until the Policy Engine foundation passes review.
