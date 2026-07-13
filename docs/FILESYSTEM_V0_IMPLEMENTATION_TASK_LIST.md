# filesystem.v0 Implementation Task List

## Current state

- Phase 0 Project Setup: Accepted
- Phase 1 Type Contracts: Accepted
- Phase 2 Registry Guard: Accepted
- `filesystem.v0`: Specified; not Prototype

## Phase 0 — Project Setup

Accepted. The TypeScript/Node.js project, strict typecheck, test runner, build, and repository structure are configured.

## Phase 1 — Type Contracts

Accepted. Provider-independent filesystem contracts and tests are implemented.

## Phase 2 — Registry Guard

Accepted. The explicit registry entry and typed registry guard are implemented and tested.

## Retired capability-specific security direction

ADR-0005 replaces the planned filesystem security guard with the central Policy Engine. Never create or implement `filesystem.security.ts`.

## Policy Engine prerequisite

ADR-0006 places the Policy Engine under `src/ghost/core/policy/`. Ghost Core owns canonical `RiskClass` and `ConfirmationLevel` types. Filesystem may depend on those Core types; Core must never depend on filesystem or another capability.

The next task is the corrected atomic Phase P0 defined in `docs/POLICY_ENGINE_IMPLEMENTATION_TASK_LIST.md`. It has not started.

All later filesystem work, including `GoogleDriveFilesystemAdapter`, remains deferred until the Policy Engine foundation passes review.

## Exclusions

Do not implement Phase P0 during documentation synchronization. Do not create `filesystem.security.ts`, use `src/ghost/policy/`, implement adapter calls, add UI, add local filesystem access, add ClientFlow logic, or deploy to production.
