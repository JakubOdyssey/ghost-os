# Codex Start Here

## Project purpose

Ghost is a system-first, node-ready digital worker architecture. It provides capability contracts, central policy decisions, adapters, verification, and execution records without coupling the core runtime to one provider, interface, machine, or workspace.

## Current status

- Repository: `ghost-os`
- Language/runtime: TypeScript on Node.js
- Capability: `filesystem.v0`
- Capability status: Specified; not Prototype
- Accepted phases: Phase 0 Project Setup, Phase 1 Type Contracts, Phase 2 Registry Guard
- Next coding task: corrected Policy Engine Phase P0

Phase P0 has not started. No adapter implementation is authorized.

## Current architecture

ADR-0005 replaces capability-specific security guards with a central Policy Engine. ADR-0006 assigns canonical ownership of shared policy types to Ghost Core.

Canonical Policy Engine path:

`src/ghost/core/policy/`

Canonical shared-type file:

`src/ghost/core/policy/policy.types.ts`

`RiskClass` and `ConfirmationLevel` must be declared there. Filesystem may import them using a type-only import. The Policy Engine must not import from filesystem or any other capability.

## Required reading order

1. `AGENTS.md`
2. `docs/CODEX_START_HERE.md`
3. `docs/GHOST_DEVELOPMENT_WORKSPACE_DECISION.md`
4. `docs/FILESYSTEM_V0_IMPLEMENTATION_TASK_LIST.md`
5. `docs/POLICY_ENGINE_ARCHITECTURE.md`
6. `docs/POLICY_ENGINE_IMPLEMENTATION_TASK_LIST.md`

## Corrected Phase P0

Phase P0 is one atomic implementation task that will:

1. Create `src/ghost/core/policy/policy.types.ts`.
2. Define `RiskClass` and `ConfirmationLevel` there.
3. Remove their declarations from `src/ghost/capabilities/filesystem/filesystem.types.ts`.
4. Import them into `filesystem.types.ts` with a type-only import.
5. Preserve all existing filesystem contracts.
6. Update tests.
7. Run typecheck, tests, and build.
8. Stop for review.

Do not perform any part of this migration until Phase P0 is explicitly authorized as an implementation task.

## Exclusions

Do not create `filesystem.security.ts`, use `src/ghost/policy/`, begin `GoogleDriveFilesystemAdapter`, call provider APIs, add UI, access a local filesystem through Ghost, add ClientFlow-specific logic, or deploy to production.
