import type {
  PolicyContextStatus,
  PolicyId,
  PolicyOutcome,
  PolicyReason,
  WorkspacePolicyInput,
  WorkspacePolicyResult,
  WorkspaceStatus,
} from "./policy.types.js";

const WORKSPACE_STATUS_POLICY_ID: PolicyId =
  "core.policy.workspace.status.v0";

interface WorkspaceStatusDecision {
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly code: string;
  readonly message: string;
}

const DECISION_BY_WORKSPACE_STATUS: Readonly<
  Record<WorkspaceStatus, WorkspaceStatusDecision>
> = {
  approved: {
    outcome: "allowed",
    contextStatus: "complete",
    code: "workspace_approved",
    message: "The resolved workspace is approved.",
  },
  restricted: {
    outcome: "blocked",
    contextStatus: "invalid",
    code: "workspace_restricted",
    message: "The resolved workspace is restricted.",
  },
  unknown: {
    outcome: "needs_context",
    contextStatus: "incomplete",
    code: "workspace_unknown",
    message: "The workspace status is unknown and requires more context.",
  },
};

function createWorkspaceReason(
  input: WorkspacePolicyInput,
  decision: WorkspaceStatusDecision,
): PolicyReason {
  return {
    policyId: WORKSPACE_STATUS_POLICY_ID,
    code: decision.code,
    message: decision.message,
    metadata: {
      workspaceId: input.workspaceId,
      workspaceStatus: input.status,
    },
  };
}

export function evaluateWorkspacePolicy(
  input: WorkspacePolicyInput,
): WorkspacePolicyResult {
  const decision = DECISION_BY_WORKSPACE_STATUS[input.status];

  return {
    outcome: decision.outcome,
    contextStatus: decision.contextStatus,
    policyId: WORKSPACE_STATUS_POLICY_ID,
    reason: createWorkspaceReason(input, decision),
  };
}
