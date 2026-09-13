import type { AiAnswer, AiResponseSource } from "../ai/ai-responder.js";
import type { NormalizedInboundMessage } from "../contracts/message.js";
import type { PolicyDecision } from "../contracts/policy.js";

export interface SimulatorResponse {
  traceId: string;
  intent: PolicyDecision["intent"];
  decision: PolicyDecision["action"];
  answer: string;
  requiresHuman: boolean;
  diagnostic: {
    reason: PolicyDecision["reason"];
    customerDataAccessed: false;
    responseSource: AiResponseSource;
    promptId?: string;
    promptVersion?: string;
    skillId?: string;
    model?: string;
  };
}

export function createSimulatorResponse(
  inbound: NormalizedInboundMessage,
  decision: PolicyDecision,
  aiAnswer?: AiAnswer,
): SimulatorResponse {
  let answer: string;

  switch (decision.action) {
    case "ALLOW_AI_RESPONSE":
      if (!aiAnswer) {
        throw new Error("An AI answer is required for ALLOW_AI_RESPONSE");
      }
      answer = aiAnswer.text;
      break;
    case "REQUIRE_AUTHENTICATION":
      answer = "Please authenticate before requesting customer-specific information.";
      break;
    case "HUMAN_HANDOFF":
      answer = "This request requires assistance from an authorized GoldenPi representative.";
      break;
  }

  return {
    traceId: inbound.traceId,
    intent: decision.intent,
    decision: decision.action,
    answer,
    requiresHuman: decision.requiresHuman,
    diagnostic: {
      reason: decision.reason,
      customerDataAccessed: false,
      responseSource: aiAnswer?.responseSource ?? "POC_FIXED",
      promptId: aiAnswer?.promptId,
      promptVersion: aiAnswer?.promptVersion,
      skillId: aiAnswer?.skillId,
      model: aiAnswer?.model,
    },
  };
}
