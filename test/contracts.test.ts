import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NormalizedInboundMessageSchema } from "../src/contracts/message.js";
import { IntentClassificationSchema } from "../src/contracts/policy.js";
import { evaluatePolicy } from "../src/policy/evaluate-policy.js";

const fixturePath = new URL(
  "../fixtures/public-bond-question.json",
  import.meta.url,
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("normalized inbound message", () => {
  it("accepts the public bond-question fixture", () => {
    expect(() => NormalizedInboundMessageSchema.parse(fixture.inbound)).not.toThrow();
  });

  it("rejects blank messages", () => {
    const invalid = structuredClone(fixture.inbound);
    invalid.content.text = "   ";

    expect(NormalizedInboundMessageSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    const invalid = { ...fixture.inbound, unsafeDebugToken: "must-not-pass" };

    expect(NormalizedInboundMessageSchema.safeParse(invalid).success).toBe(false);
  });

  it("requires a customer ID for verified authentication", () => {
    const invalid = structuredClone(fixture.inbound);
    invalid.authentication = { level: "VERIFIED" };

    expect(NormalizedInboundMessageSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("POC policy evaluation", () => {
  it("allows an AI response for public information without customer data", () => {
    const inbound = NormalizedInboundMessageSchema.parse(fixture.inbound);
    const classification = IntentClassificationSchema.parse(
      fixture.classification,
    );

    const decision = evaluatePolicy({
      traceId: inbound.traceId,
      authenticationLevel: inbound.authentication.level,
      classification,
    });

    expect(decision).toMatchObject(fixture.expectedDecision);
  });

  it("requires authentication for customer-specific questions", () => {
    const decision = evaluatePolicy({
      traceId: fixture.inbound.traceId,
      authenticationLevel: "ANONYMOUS",
      classification: {
        intent: "CUSTOMER_SPECIFIC",
        confidence: 0.99,
      },
    });

    expect(decision.action).toBe("REQUIRE_AUTHENTICATION");
    expect(decision.allowCustomerData).toBe(false);
  });

  it("keeps customer data disabled in the POC even after verification", () => {
    const decision = evaluatePolicy({
      traceId: fixture.inbound.traceId,
      authenticationLevel: "VERIFIED",
      classification: {
        intent: "CUSTOMER_SPECIFIC",
        confidence: 0.99,
      },
    });

    expect(decision.action).toBe("HUMAN_HANDOFF");
    expect(decision.reason).toBe("POC_CUSTOMER_DATA_DISABLED");
  });

  it("routes investment recommendations to a human", () => {
    const decision = evaluatePolicy({
      traceId: fixture.inbound.traceId,
      authenticationLevel: "ANONYMOUS",
      classification: {
        intent: "INVESTMENT_RECOMMENDATION",
        confidence: 0.95,
      },
    });

    expect(decision.action).toBe("HUMAN_HANDOFF");
    expect(decision.allowAiResponse).toBe(false);
  });
});
