import type { AuthenticationLevel } from "../contracts/message.js";
import type {
  IntentClassification,
  PolicyDecision,
} from "../contracts/policy.js";
import { PolicyDecisionSchema } from "../contracts/policy.js";

export interface EvaluatePolicyInput {
  traceId: string;
  authenticationLevel: AuthenticationLevel;
  classification: IntentClassification;
}

export function evaluatePolicy(input: EvaluatePolicyInput): PolicyDecision {
  const { traceId, authenticationLevel, classification } = input;

  let decision: PolicyDecision;

  switch (classification.intent) {
    case "PUBLIC_INFORMATION":
      decision = {
        traceId,
        intent: classification.intent,
        action: "ALLOW_AI_RESPONSE",
        reason: "PUBLIC_INFORMATION_ALLOWED",
        allowAiResponse: true,
        allowCustomerData: false,
        requiresHuman: false,
      };
      break;

    case "CUSTOMER_SPECIFIC":
      decision =
        authenticationLevel === "VERIFIED"
          ? {
              traceId,
              intent: classification.intent,
              action: "HUMAN_HANDOFF",
              reason: "POC_CUSTOMER_DATA_DISABLED",
              allowAiResponse: false,
              allowCustomerData: false,
              requiresHuman: true,
            }
          : {
              traceId,
              intent: classification.intent,
              action: "REQUIRE_AUTHENTICATION",
              reason: "CUSTOMER_AUTHENTICATION_REQUIRED",
              allowAiResponse: false,
              allowCustomerData: false,
              requiresHuman: false,
            };
      break;

    case "TRANSACTION_REQUEST":
      decision = {
        traceId,
        intent: classification.intent,
        action: "HUMAN_HANDOFF",
        reason: "TRANSACTION_REQUIRES_HUMAN",
        allowAiResponse: false,
        allowCustomerData: false,
        requiresHuman: true,
      };
      break;

    case "INVESTMENT_RECOMMENDATION":
      decision = {
        traceId,
        intent: classification.intent,
        action: "HUMAN_HANDOFF",
        reason: "RECOMMENDATION_REQUIRES_HUMAN",
        allowAiResponse: false,
        allowCustomerData: false,
        requiresHuman: true,
      };
      break;

    case "UNSUPPORTED":
      decision = {
        traceId,
        intent: classification.intent,
        action: "HUMAN_HANDOFF",
        reason: "UNSUPPORTED_REQUIRES_HUMAN",
        allowAiResponse: false,
        allowCustomerData: false,
        requiresHuman: true,
      };
      break;
  }

  return PolicyDecisionSchema.parse(decision);
}
