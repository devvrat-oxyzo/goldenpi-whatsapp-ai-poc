import { randomUUID } from "node:crypto";
import { GoogleAuth } from "google-auth-library";
import {
  BackendResponseSchema,
  type BackendResponse,
} from "./contracts.js";

export interface ChatBackendClient {
  sendMessage(message: string): Promise<BackendResponse>;
}

function createInboundMessage(message: string) {
  const traceId = randomUUID();

  return {
    schemaVersion: "1.0",
    traceId,
    provider: "simulator",
    providerMessageId: `demo-${traceId}`,
    channel: "simulator",
    sender: { externalId: "iap-internal-demo" },
    content: { type: "text", text: message },
    authentication: { level: "ANONYMOUS" },
    receivedAt: new Date().toISOString(),
  };
}

export class CloudRunBackendClient implements ChatBackendClient {
  private readonly auth = new GoogleAuth();

  constructor(private readonly backendUrl: string) {}

  async sendMessage(message: string): Promise<BackendResponse> {
    const audience = this.backendUrl.replace(/\/$/, "");
    const client = await this.auth.getIdTokenClient(audience);
    const response = await client.request({
      url: `${audience}/v1/simulate`,
      method: "POST",
      data: createInboundMessage(message),
      timeout: 35_000,
    });

    return BackendResponseSchema.parse(response.data);
  }
}

export class LocalMockBackendClient implements ChatBackendClient {
  async sendMessage(message: string): Promise<BackendResponse> {
    const inbound = createInboundMessage(message);
    const recommendation = /\b(recommend|best bond|which bond|should i (buy|invest))\b/i.test(message);
    const transaction = /\b(place|execute|submit|complete)\b.*\b(order|buy|sell|transaction)\b/i.test(message);
    const customerSpecific = /\b(my|portfolio|order|payment|account)\b/i.test(message);

    if (recommendation || transaction) {
      return {
        traceId: inbound.traceId,
        intent: recommendation ? "INVESTMENT_RECOMMENDATION" : "TRANSACTION_REQUEST",
        decision: "HUMAN_HANDOFF",
        answer: recommendation
          ? "I can provide general bond education, but this recommendation request needs a qualified human review."
          : "This transaction request needs secure verification and human assistance.",
        requiresHuman: true,
        diagnostic: {
          reason: recommendation
            ? "INVESTMENT_RECOMMENDATION_REQUIRES_HUMAN"
            : "TRANSACTION_REQUIRES_HUMAN",
          customerDataAccessed: false,
          responseSource: "LOCAL_MOCK",
        },
      };
    }

    if (customerSpecific) {
      return {
        traceId: inbound.traceId,
        intent: "CUSTOMER_SPECIFIC",
        decision: "REQUIRE_AUTHENTICATION",
        answer: "Please authenticate before requesting customer-specific information.",
        requiresHuman: false,
        diagnostic: {
          reason: "CUSTOMER_AUTHENTICATION_REQUIRED",
          customerDataAccessed: false,
          responseSource: "LOCAL_MOCK",
        },
      };
    }

    return {
      traceId: inbound.traceId,
      intent: "PUBLIC_INFORMATION",
      decision: "ALLOW_AI_RESPONSE",
      answer:
        "A bond is a debt instrument where an investor lends money to an issuer. The issuer generally repays the principal at maturity and may make interest payments along the way. Bonds carry risks, including credit, interest-rate, and liquidity risk.",
      requiresHuman: false,
      diagnostic: {
        reason: "PUBLIC_INFORMATION_ALLOWED",
        customerDataAccessed: false,
        responseSource: "LOCAL_MOCK",
        promptId: "goldenpi-public-information",
        promptVersion: "1.0.0",
        skillId: "PUBLIC_BOND_EDUCATION",
        model: "not-called-locally",
      },
    };
  }
}

export function createBackendClientFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ChatBackendClient {
  const mode = environment.BACKEND_MODE ?? "mock";

  if (mode === "mock") {
    return new LocalMockBackendClient();
  }

  if (mode !== "cloud-run") {
    throw new Error(`Unsupported BACKEND_MODE: ${mode}`);
  }

  if (!environment.BACKEND_URL) {
    throw new Error("BACKEND_URL is required when BACKEND_MODE=cloud-run");
  }

  return new CloudRunBackendClient(environment.BACKEND_URL);
}
