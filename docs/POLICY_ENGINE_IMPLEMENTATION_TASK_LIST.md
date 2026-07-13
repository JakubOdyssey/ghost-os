# Policy Engine Implementation Task List v0.1

## Execution rule

Implement one explicitly authorized phase at a time. The next coding task is corrected Phase P0. It has not started.

## Phase P0 — Canonical shared policy types

Phase P0 is one atomic implementation task. It must:

1. Create `src/ghost/core/policy/policy.types.ts`.
2. Define canonical `RiskClass` and `ConfirmationLevel` there.
3. Remove the existing `RiskClass` and `ConfirmationLevel` declarations from `src/ghost/capabilities/filesystem/filesystem.types.ts`.
4. Import both shared types into `filesystem.types.ts` using a type-only import from Ghost Core.
5. Preserve all existing filesystem contract behavior and public shapes.
6. Update tests to cover the canonical types and preserved filesystem contracts.
7. Run `npm run typecheck`, `npm test`, and `npm run build`.
8. Stop for review.

All eight steps form one atomic migration. Do not leave duplicate canonical declarations or an intermediate dependency direction.

## Dependency constraint

Filesystem may import shared policy types from `src/ghost/core/policy/policy.types.ts`. Policy Engine code must not import types from filesystem or another capability.

## Not included in Phase P0

- Policy decision logic
- Risk mapping
- Confirmation logic
- Workspace policy
- Policy Engine orchestration
- Adapter calls
- `filesystem.security.ts`
- Any file under obsolete `src/ghost/policy/`

Phase P0 requires separate explicit implementation approval.
