import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { performance } from "node:perf_hooks";
import { ZodError } from "zod";
import { NormalizedInboundMessageSchema } from "../contracts/message.js";
import { UnsupportedProviderMessageError } from "../providers/provider-adapter.js";
import { watiAdapter } from "../providers/wati/wati-adapter.js";
import { processInbound } from "../simulator/process-inbound.js";

const maximumBodyBytes = 64 * 1024;

interface SafeLogEvent {
  event: "request.completed" | "request.rejected";
  method?: string;
  path?: string;
  status: number;
  traceId?: string;
  policyAction?: string;
  responseSource?: string;
  promptId?: string;
  promptVersion?: string;
  skillId?: string;
  model?: string;
  elapsedMs: number;
}

export type SafeLogger = (event: SafeLogEvent) => void;

export const writeSafeLog: SafeLogger = (event) => {
  console.info(JSON.stringify(event));
};

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > maximumBodyBytes) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new SyntaxError("Request body is required");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createApp(
  logger: SafeLogger = writeSafeLog,
  aiResponder: AiResponder = new FixedAiResponder(),
) {
  return createServer(async (request, response) => {
    const startedAt = performance.now();
    const method = request.method;
    const path = new URL(request.url ?? "/", "http://localhost").pathname;

    if (method === "GET" && path === "/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "goldenpi-whatsapp-poc",
        version: "0.1.0",
      });
      logger({
        event: "request.completed",
        method,
        path,
        status: 200,
        elapsedMs: Math.round(performance.now() - startedAt),
      });
      return;
    }

    if (method === "POST" && path === "/v1/simulate") {
      try {
        const body = await readJson(request);
        const inbound = NormalizedInboundMessageSchema.parse(body);
        const result = await processInbound(inbound, aiResponder);

        sendJson(response, 200, result);
        logger({
          event: "request.completed",
          method,
          path,
          status: 200,
          traceId: inbound.traceId,
          policyAction: result.decision,
          responseSource: result.diagnostic.responseSource,
          promptId: result.diagnostic.promptId,
          promptVersion: result.diagnostic.promptVersion,
          skillId: result.diagnostic.skillId,
          model: result.diagnostic.model,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
        const status = tooLarge ? 413 : 400;
        const code = tooLarge ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST";

        sendJson(response, status, {
          error: code,
          message:
            error instanceof ZodError
              ? "Request does not match the normalized message contract."
              : tooLarge
                ? "Request body exceeds 64 KiB."
                : "Request body must contain valid JSON.",
        });
        logger({
          event: "request.rejected",
          method,
          path,
          status,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }
      return;
    }

    if (method === "POST" && path === "/v1/providers/wati/webhook") {
      try {
        const body = await readJson(request);
        const inbound = watiAdapter.normalize(body);
        const result = await processInbound(inbound, aiResponder);

        sendJson(response, 200, {
          accepted: true,
          providerMessageId: inbound.providerMessageId,
          result,
        });
        logger({
          event: "request.completed",
          method,
          path,
          status: 200,
          traceId: inbound.traceId,
          policyAction: result.decision,
          responseSource: result.diagnostic.responseSource,
          promptId: result.diagnostic.promptId,
          promptVersion: result.diagnostic.promptVersion,
          skillId: result.diagnostic.skillId,
          model: result.diagnostic.model,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        const unsupported = error instanceof UnsupportedProviderMessageError;
        const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
        const status = unsupported ? 422 : tooLarge ? 413 : 400;
        const code = unsupported
          ? "UNSUPPORTED_MESSAGE_TYPE"
          : tooLarge
            ? "REQUEST_TOO_LARGE"
            : "INVALID_PROVIDER_PAYLOAD";

        sendJson(response, status, { error: code });
        logger({
          event: "request.rejected",
          method,
          path,
          status,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }
      return;
    }

    sendJson(response, 404, { error: "NOT_FOUND" });
    logger({
      event: "request.rejected",
      method,
      path,
      status: 404,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  });
}
import type { AiResponder } from "../ai/ai-responder.js";
import { FixedAiResponder } from "../ai/ai-responder.js";
