import type { NormalizedInboundMessage } from "../contracts/message.js";

export interface ProviderAdapter<TPayload = unknown> {
  readonly provider: NormalizedInboundMessage["provider"];
  normalize(payload: TPayload): NormalizedInboundMessage;
}

export class UnsupportedProviderMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedProviderMessageError";
  }
}
