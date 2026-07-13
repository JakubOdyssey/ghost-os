import type {
  ActorAuthorizationStatus,
  PermissionPolicyInput,
  PermissionPolicyResult,
  PolicyContextStatus,
  PolicyId,
  PolicyOutcome,
  PolicyReason,
} from "./policy.types.js";

const ACTOR_AUTHORIZATION_POLICY_ID: PolicyId =
  "core.policy.permission.actor-authorization.v0";

interface ActorAuthorizationDecision {
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly code: string;
  readonly message: string;
}

const DECISION_BY_ACTOR_AUTHORIZATION_STATUS: Readonly<
  Record<ActorAuthorizationStatus, ActorAuthorizationDecision>
> = {
  authorized: {
    outcome: "allowed",
    contextStatus: "complete",
    code: "actor_authorized",
    message: "The resolved actor is authorized.",
  },
  unauthorized: {
    outcome: "blocked",
    contextStatus: "invalid",
    code: "actor_unauthorized",
    message: "The resolved actor is unauthorized.",
  },
  unknown: {
    outcome: "needs_context",
    contextStatus: "incomplete",
    code: "actor_authorization_unknown",
    message: "The actor authorization status is unknown and requires more context.",
  },
};

function createPermissionReason(
  input: PermissionPolicyInput,
  decision: ActorAuthorizationDecision,
): PolicyReason {
  return {
    policyId: ACTOR_AUTHORIZATION_POLICY_ID,
    code: decision.code,
    message: decision.message,
    metadata: {
      actorId: input.actorId,
      actorAuthorizationStatus: input.status,
    },
  };
}

export function evaluatePermissionPolicy(
  input: PermissionPolicyInput,
): PermissionPolicyResult {
  const decision = DECISION_BY_ACTOR_AUTHORIZATION_STATUS[input.status];

  return {
    outcome: decision.outcome,
    contextStatus: decision.contextStatus,
    policyId: ACTOR_AUTHORIZATION_POLICY_ID,
    reason: createPermissionReason(input, decision),
  };
}
