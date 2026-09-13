import type { NormalizedInboundMessage } from "../contracts/message.js";
import { evaluatePolicy } from "../policy/evaluate-policy.js";
import { classifyIntent } from "./classify-intent.js";
import { createSimulatorResponse } from "./create-response.js";

export function processInbound(inbound: NormalizedInboundMessage) {
  const classification = classifyIntent(inbound.content.text);
  const decision = evaluatePolicy({
    traceId: inbound.traceId,
    authenticationLevel: inbound.authentication.level,
    classification,
  });

  return createSimulatorResponse(inbound, decision);
}
