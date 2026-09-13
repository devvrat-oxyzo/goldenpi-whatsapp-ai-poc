import { z } from "zod";

export const ChatRequestSchema = z.strictObject({
  message: z.string().trim().min(1).max(1_000),
});

export const BackendResponseSchema = z.object({
  traceId: z.uuid(),
  intent: z.string(),
  decision: z.string(),
  answer: z.string().min(1),
  requiresHuman: z.boolean(),
  diagnostic: z.object({
    reason: z.string(),
    customerDataAccessed: z.boolean(),
    responseSource: z.string(),
    promptId: z.string().optional(),
    promptVersion: z.string().optional(),
    skillId: z.string().optional(),
    model: z.string().optional(),
  }),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type BackendResponse = z.infer<typeof BackendResponseSchema>;
