import { z } from "zod";

export const IntentSchema = z.enum([
  "PUBLIC_INFORMATION",
  "CUSTOMER_SPECIFIC",
  "TRANSACTION_REQUEST",
  "INVESTMENT_RECOMMENDATION",
  "UNSUPPORTED",
]);

export const IntentClassificationSchema = z.strictObject({
  intent: IntentSchema,
  confidence: z.number().min(0).max(1),
});

export const PolicyActionSchema = z.enum([
  "ALLOW_AI_RESPONSE",
  "REQUIRE_AUTHENTICATION",
  "HUMAN_HANDOFF",
]);

export const PolicyReasonSchema = z.enum([
  "PUBLIC_INFORMATION_ALLOWED",
  "CUSTOMER_AUTHENTICATION_REQUIRED",
  "POC_CUSTOMER_DATA_DISABLED",
  "TRANSACTION_REQUIRES_HUMAN",
  "RECOMMENDATION_REQUIRES_HUMAN",
  "UNSUPPORTED_REQUIRES_HUMAN",
]);

export const PolicyDecisionSchema = z.strictObject({
  traceId: z.uuid(),
  intent: IntentSchema,
  action: PolicyActionSchema,
  reason: PolicyReasonSchema,
  allowAiResponse: z.boolean(),
  allowCustomerData: z.boolean(),
  requiresHuman: z.boolean(),
});

export type IntentClassification = z.infer<
  typeof IntentClassificationSchema
>;
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
