# AGENTS.md

## Purpose

This file defines the operating rules for agents working in `ghost-os`.

Ghost is a system-first, node-ready digital worker architecture. It is independent from ClientFlow and is not a chatbot, dashboard, single automation script, or desktop-only application.

## Mandatory workflow

Before making any change:

1. Read `docs/CODEX_START_HERE.md` in full.
2. Read the documents it names in their required order.
3. Confirm the active phase, accepted phases, scope, and exclusions.
4. Make only changes explicitly authorized for the active phase.

Follow the active task list in order. ADR-0005 establishes the central Policy Engine. ADR-0006 establishes ownership of shared policy types and the allowed dependency direction. Surface conflicts before proceeding.

## Current state

- Repository: `ghost-os`
- Capability: `filesystem.v0`
- Capability status: Specified; not Prototype
- Accepted implementation: Phase 0 Project Setup, Phase 1 Type Contracts, Phase 2 Registry Guard
- Next coding task: corrected Phase P0 from `docs/POLICY_ENGINE_IMPLEMENTATION_TASK_LIST.md`

Phase P0 has not started.

## Policy architecture rules

- The central Policy Engine is located under `src/ghost/core/policy/`.
- Ghost Core owns canonical shared `RiskClass` and `ConfirmationLevel` types.
- Their canonical location is `src/ghost/core/policy/policy.types.ts`.
- Capabilities, including filesystem, may import shared policy types from Ghost Core.
- Ghost Core and the Policy Engine must not import types from filesystem or another capability.
- Do not create or implement `filesystem.security.ts`.
- Do not use the obsolete `src/ghost/policy/` path.
- `GoogleDriveFilesystemAdapter` must not begin until the Policy Engine foundation passes review.

## Verification and reporting

After every code or configuration change, run typecheck, tests, and build; report results, changed files, and assumptions. Documentation-only changes do not authorize implementation.

## Git safety

Never commit, push, publish, create a remote, or open a pull request without explicit user approval.
