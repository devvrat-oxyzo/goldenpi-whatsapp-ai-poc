import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  NormalizedInboundMessageSchema,
  type NormalizedInboundMessage,
} from "../../contracts/message.js";
import {
  UnsupportedProviderMessageError,
  type ProviderAdapter,
} from "../provider-adapter.js";

export const WatiMessageReceivedSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    created: z.iso.datetime({ offset: true }).optional(),
    whatsappMessageId: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).max(4_096),
    type: z.string().trim().min(1),
    timestamp: z.string().regex(/^\d+$/).optional(),
    eventType: z.enum(["message", "messageReceived"]),
    waId: z.string().trim().min(1).optional(),
    bsuid: z.string().trim().min(1).nullable().optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (!value.whatsappMessageId && !value.id) {
      context.addIssue({
        code: "custom",
        path: ["whatsappMessageId"],
        message: "whatsappMessageId or id is required",
      });
    }

    if (!value.bsuid && !value.waId) {
      context.addIssue({
        code: "custom",
        path: ["bsuid"],
        message: "bsuid or waId is required",
      });
    }

    if (!value.created && !value.timestamp) {
      context.addIssue({
        code: "custom",
        path: ["created"],
        message: "created or timestamp is required",
      });
    }
  });

export type WatiMessageReceived = z.infer<typeof WatiMessageReceivedSchema>;

function pseudonymizeSender(senderId: string): string {
  const digest = createHash("sha256").update(senderId).digest("hex");
  return `wati:${digest}`;
}

function resolveReceivedAt(payload: WatiMessageReceived): string {
  if (payload.created) {
    return payload.created;
  }

  return new Date(Number(payload.timestamp) * 1_000).toISOString();
}

export const watiAdapter: ProviderAdapter<unknown> = {
  provider: "wati",
  normalize(payload: unknown): NormalizedInboundMessage {
    const message = WatiMessageReceivedSchema.parse(payload);

    if (message.type !== "text") {
      throw new UnsupportedProviderMessageError(
        `WATI message type is not supported: ${message.type}`,
      );
    }

    const senderId = message.bsuid ?? message.waId;

    return NormalizedInboundMessageSchema.parse({
      schemaVersion: "1.0",
      traceId: randomUUID(),
      provider: "wati",
      providerMessageId: message.whatsappMessageId ?? message.id,
      channel: "whatsapp",
      sender: {
        externalId: pseudonymizeSender(senderId as string),
      },
      content: {
        type: "text",
        text: message.text,
      },
      authentication: {
        level: "ANONYMOUS",
      },
      receivedAt: resolveReceivedAt(message),
    });
  },
};
