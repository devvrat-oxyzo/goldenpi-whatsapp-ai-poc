import { z } from "zod";

export const ProviderSchema = z.enum([
  "simulator",
  "wati",
  "meta",
  "gupshup",
  "twilio",
]);

export const AuthenticationLevelSchema = z.enum([
  "ANONYMOUS",
  "IDENTIFIED",
  "VERIFIED",
]);

const SenderSchema = z.strictObject({
  externalId: z.string().trim().min(1).max(128),
  phoneE164: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "phoneE164 must be a valid E.164 number")
    .optional(),
});

const TextContentSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string().trim().min(1).max(4_096),
});

const AuthenticationContextSchema = z
  .strictObject({
    level: AuthenticationLevelSchema,
    customerId: z.string().trim().min(1).max(128).optional(),
  })
  .superRefine((value, context) => {
    if (value.level === "VERIFIED" && !value.customerId) {
      context.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "customerId is required when level is VERIFIED",
      });
    }
  });

export const NormalizedInboundMessageSchema = z.strictObject({
  schemaVersion: z.literal("1.0"),
  traceId: z.uuid(),
  provider: ProviderSchema,
  providerMessageId: z.string().trim().min(1).max(256),
  channel: z.enum(["simulator", "whatsapp"]),
  sender: SenderSchema,
  content: TextContentSchema,
  authentication: AuthenticationContextSchema,
  receivedAt: z.iso.datetime({ offset: true }),
});

export type Provider = z.infer<typeof ProviderSchema>;
export type AuthenticationLevel = z.infer<
  typeof AuthenticationLevelSchema
>;
export type NormalizedInboundMessage = z.infer<
  typeof NormalizedInboundMessageSchema
>;
