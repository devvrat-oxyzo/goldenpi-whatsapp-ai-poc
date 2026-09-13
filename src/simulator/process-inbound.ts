import {
  FixedAiResponder,
  type AiAnswer,
  type AiResponder,
} from "../ai/ai-responder.js";
import type { NormalizedInboundMessage } from "../contracts/message.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import {
  loadPromptBundle,
  PromptSkillId,
} from "../prompts/prompt-registry.js";
import { classifyIntent } from "./classify-intent.js";
import { createSimulatorResponse } from "./create-response.js";

const defaultAiResponder = new FixedAiResponder();
const fallbackAiResponder = new FixedAiResponder("POC_FALLBACK");

export async function processInbound(
  inbound: NormalizedInboundMessage,
  aiResponder: AiResponder = defaultAiResponder,
) {
  const classification = classifyIntent(inbound.content.text);
  const decision = evaluatePolicy({
    traceId: inbound.traceId,
    authenticationLevel: inbound.authentication.level,
    classification,
  });

  let aiAnswer: AiAnswer | undefined;

  if (decision.action === "ALLOW_AI_RESPONSE") {
    const prompt = loadPromptBundle(PromptSkillId.PublicBondEducation);

    try {
      aiAnswer = await aiResponder.generatePublicInformationAnswer({
        question: inbound.content.text,
        prompt,
      });
    } catch {
      aiAnswer = await fallbackAiResponder.generatePublicInformationAnswer({
        question: inbound.content.text,
        prompt,
      });
    }
  }

  return createSimulatorResponse(inbound, decision, aiAnswer);
}
