export type RiskClass = "R0" | "R1" | "R2" | "R3" | "R4";

export type ConfirmationLevel = "C0" | "C1" | "C2" | "C3";

export type PolicyOutcome =
  | "allowed"
  | "blocked"
  | "needs_confirmation"
  | "needs_context";

export type PolicyContextStatus = "complete" | "incomplete" | "invalid";

export type PolicyId = string;

export type PolicySetId = string;

export interface PolicyReason {
  readonly policyId: PolicyId;
  readonly code: string;
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PolicyCheckResult {
  readonly policySetId: PolicySetId;
  readonly policyId: PolicyId;
  readonly outcome: PolicyOutcome;
  readonly reasons: readonly PolicyReason[];
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RiskClassificationResult {
  readonly riskClass: RiskClass;
  readonly policyId: PolicyId;
  readonly reason: PolicyReason;
}

export interface ConfirmationRequirementResult {
  readonly confirmationLevel: ConfirmationLevel;
  readonly policyId: PolicyId;
  readonly reason: PolicyReason;
}

export type WorkspaceStatus = "approved" | "restricted" | "unknown";

export interface WorkspacePolicyInput {
  readonly workspaceId: string;
  readonly status: WorkspaceStatus;
}

export interface WorkspacePolicyResult {
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly policyId: PolicyId;
  readonly reason: PolicyReason;
}

export type ActorAuthorizationStatus =
  | "authorized"
  | "unauthorized"
  | "unknown";

export interface PermissionPolicyInput {
  readonly actorId: string;
  readonly status: ActorAuthorizationStatus;
}

export interface PermissionPolicyResult {
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly policyId: PolicyId;
  readonly reason: PolicyReason;
}

export type ConfirmationSatisfactionStatus =
  | "satisfied"
  | "missing"
  | "rejected"
  | "unknown";

export interface ConfirmationSatisfactionInput {
  readonly requiredLevel: ConfirmationLevel;
  readonly status: ConfirmationSatisfactionStatus;
}

export interface ConfirmationSatisfactionResult {
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly policyId: PolicyId;
  readonly reason: PolicyReason;
}

export interface PolicyEngineInput {
  readonly decisionId: string;
  readonly evaluatedAt: string;
  readonly requestId: string;
  readonly capabilityId: string;
  readonly operation: string;
  readonly workspace: WorkspacePolicyInput;
  readonly permission: PermissionPolicyInput;
  readonly confirmationSatisfactionStatus: ConfirmationSatisfactionStatus;
}

/** Capability-neutral input supplied to the central Policy Engine. */
export interface PolicyEvaluationInput {
  readonly requestId: string;
  readonly actor: string;
  readonly capabilityId: string;
  readonly operation: string;
  readonly workspaceId: string;
  readonly targetId: string | null;
  readonly targetName: string | null;
  readonly input: Readonly<Record<string, unknown>>;
  readonly requestedAt: string;
  readonly confirmationStatus:
    | "not_required"
    | "required"
    | "approved"
    | "rejected";
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PolicyDecision {
  readonly decisionId: string;
  readonly requestId: string;
  readonly outcome: PolicyOutcome;
  readonly contextStatus: PolicyContextStatus;
  readonly riskClass: RiskClass | null;
  readonly confirmationLevel: ConfirmationLevel | null;
  readonly reasons: readonly PolicyReason[];
  readonly appliedPolicyIds: readonly PolicyId[];
  readonly evaluatedAt: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}
