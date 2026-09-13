import type { IntentClassification } from "../contracts/policy.js";

const recommendationPattern =
  /\b(recommend|suggest|best bond|which bond|should i invest)\b/i;
const transactionPattern =
  /\b(buy|sell|redeem|place (?:an )?order|execute|transact)\b/i;
const customerPattern =
  /\b(my|mine)\s+(account|bond|bonds|holding|holdings|investment|investments|portfolio|return|returns)\b/i;
const publicBondPattern =
  /\b(what is|explain|define|how (?:does|do))\b.*\b(bond|bonds|yield|coupon|maturity)\b/i;

export function classifyIntent(text: string): IntentClassification {
  if (recommendationPattern.test(text)) {
    return { intent: "INVESTMENT_RECOMMENDATION", confidence: 0.95 };
  }

  if (transactionPattern.test(text)) {
    return { intent: "TRANSACTION_REQUEST", confidence: 0.95 };
  }

  if (customerPattern.test(text)) {
    return { intent: "CUSTOMER_SPECIFIC", confidence: 0.95 };
  }

  if (publicBondPattern.test(text)) {
    return { intent: "PUBLIC_INFORMATION", confidence: 0.95 };
  }

  return { intent: "UNSUPPORTED", confidence: 0.5 };
}
