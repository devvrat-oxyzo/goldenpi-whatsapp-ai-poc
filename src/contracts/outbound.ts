import { z } from "zod";
import { ProviderSchema } from "./message.js";

export const NormalizedOutboundMessageSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  traceId: z.uuid(),
  provider: ProviderSchema,
  recipientExternalId: z.string().trim().min(1).max(128),
  content: z.strictObject({
    type: z.literal("text"),
    text: z.string().trim().min(1).max(4_096),
  }),
});

export type NormalizedOutboundMessage = z.infer<
  typeof NormalizedOutboundMessageSchema
>;
