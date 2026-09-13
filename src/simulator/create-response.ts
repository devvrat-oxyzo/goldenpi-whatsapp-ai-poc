import type { NormalizedInboundMessage } from "../contracts/message.js";
import type { PolicyDecision } from "../contracts/policy.js";

const publicBondAnswer =
  "A bond is a debt instrument. When you buy one, you lend money to an issuer—such as a company or government—which generally promises interest payments and repayment of principal at maturity. Bonds carry risks, including credit, interest-rate, and liquidity risk.";

export interface SimulatorResponse {
  traceId: string;
  intent: PolicyDecision["intent"];
  decision: PolicyDecision["action"];
  answer: string;
  requiresHuman: boolean;
  diagnostic: {
    reason: PolicyDecision["reason"];
    customerDataAccessed: false;
    responseSource: "POC_FIXED";
  };
}

export function createSimulatorResponse(
  inbound: NormalizedInboundMessage,
  decision: PolicyDecision,
): SimulatorResponse {
  let answer: string;

  switch (decision.action) {
    case "ALLOW_AI_RESPONSE":
      answer = publicBondAnswer;
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
      responseSource: "POC_FIXED",
    },
  };
}
