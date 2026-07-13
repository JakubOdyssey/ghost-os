# Ghost Development Workspace Decision

## Decision

Ghost will be developed in its own repository, `ghost-os`, separate from ClientFlow and from all existing ClientFlow projects.

Ghost is an independent, system-first, node-ready digital worker architecture. ClientFlow may become a future consumer or integration point, but it does not own Ghost's core contracts, runtime, adapters, or roadmap. No ClientFlow-specific logic belongs in this repository during `filesystem.v0`.

## Technology baseline

- Language: TypeScript
- Runtime: Node.js
- Initial execution environment: CLI/local runtime first
- Initial capability: `filesystem.v0`
- First adapter: `GoogleDriveFilesystemAdapter`

TypeScript provides explicit contracts at capability and adapter boundaries. Node.js supplies a portable runtime without making a browser, desktop shell, or particular operating system part of the architecture.

## CLI/local runtime first

The first runnable path may use a CLI or local process because it is the smallest environment for validating contracts and orchestration. This is a development and verification choice, not the final product boundary.

Core modules must not depend on terminal interaction, local filesystem access, one machine, one workspace, or CLI-specific input and output. Runtime requests and results must be usable by future interfaces and distributed nodes.

## No UI in v0

There will be no UI in `filesystem.v0`. A dashboard, chat surface, desktop shell, or other interface would introduce product assumptions before the core system contracts and guards are validated. Interfaces may be considered in a later, explicitly approved milestone.

## System-first and node-ready rule

Every `filesystem.v0` decision must preserve these constraints:

- Do not assume one machine.
- Do not assume one interface.
- Do not assume one workspace.
- Do not assume a CLI is the final form.
- Separate provider adapters from runtime and capability contracts.
- Represent requests, results, verification, and execution records in transport-neutral types.

“Node-ready” means the architecture can later execute capabilities through different runtime nodes. It does not mean node coordination, networking, deployment, or production infrastructure is in the current scope.

## Consequences

The separate repository creates a clean ownership and dependency boundary. Development starts with TypeScript contracts and a Node.js verification path. `GoogleDriveFilesystemAdapter` is the first adapter, but live Google Drive API calls are deferred. There is no UI, local filesystem adapter, ClientFlow coupling, memory database, or production deployment in v0.

This decision keeps Ghost broader than a single automation, interface, workspace, or host while keeping the first milestone small enough to verify rigorously.
