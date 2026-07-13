# Architect Notes

## Project status

- Repository: `ghost-os`
- Capability: `filesystem.v0`
- Capability status: Specified; not Prototype
- Accepted implementation: Phase 0 Project Setup, Phase 1 Type Contracts, Phase 2 Registry Guard
- Next coding task: corrected Policy Engine Phase P0
- Phase P0 status: Not started

## Accepted architecture decisions

- ADR-0005 replaces capability-specific security guards with a central Policy Engine.
- ADR-0006 makes Ghost Core the canonical owner of shared `RiskClass` and `ConfirmationLevel` types.
- Canonical Policy Engine path: `src/ghost/core/policy/`.
- Canonical shared-type file: `src/ghost/core/policy/policy.types.ts`.
- Filesystem may import shared policy types from Ghost Core.
- Policy Engine must not import from filesystem or another capability.
- The obsolete `src/ghost/policy/` path must not be used.
- `GoogleDriveFilesystemAdapter` remains blocked until the Policy Engine foundation passes review.

## Corrected Phase P0 migration

Phase P0 will atomically create the canonical Core policy types, remove their filesystem declarations, introduce a type-only filesystem-to-Core import, preserve filesystem contracts, update tests, run all verification, and stop for review.

No part of that migration has been implemented by this documentation update.

## Existing implementation facts

- The project uses npm, Node.js, TypeScript, and Vitest.
- Filesystem types and registry guard are implemented and accepted.
- `RiskClass` and `ConfirmationLevel` are currently still declared in `filesystem.types.ts` pending Phase P0.
- No Policy Engine source files exist.
- No filesystem security guard or adapter is implemented.

## Unresolved questions

- Policy Engine phases after P0 require separate definition and approval.
- The durable identifier and timestamp formats remain unspecified.
- The final supported Node.js version policy remains open beyond the current project configuration.
