import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { ZodError } from "zod";
import type { ChatBackendClient } from "./backend-client.js";
import { ChatRequestSchema } from "./contracts.js";

const maximumBodyBytes = 16 * 1024;

const staticFiles = {
  "/": { file: "public/index.html", contentType: "text/html; charset=utf-8" },
  "/styles.css": { file: "public/styles.css", contentType: "text/css; charset=utf-8" },
  "/app.js": { file: "public/app.js", contentType: "text/javascript; charset=utf-8" },
} as const;

export interface SafeUiLog {
  event: "ui.request.completed" | "ui.request.rejected";
  method?: string;
  path: string;
  status: number;
  traceId?: string;
  policyAction?: string;
  responseSource?: string;
  elapsedMs: number;
}

export type SafeUiLogger = (event: SafeUiLog) => void;

export const writeSafeUiLog: SafeUiLogger = (event) => {
  console.info(JSON.stringify(event));
};

function securityHeaders(contentType: string) {
  return {
    "content-type": contentType,
    "cache-control": "no-store",
    "content-security-policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, securityHeaders("application/json; charset=utf-8"));
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

export function createDemoApp(
  backendClient: ChatBackendClient,
  logger: SafeUiLogger = writeSafeUiLog,
) {
  return createServer(async (request, response) => {
    const startedAt = performance.now();
    const method = request.method;
    const path = new URL(request.url ?? "/", "http://localhost").pathname;

    if (method === "GET" && path === "/health") {
      sendJson(response, 200, { status: "ok", service: "goldenpi-chat-demo" });
      return;
    }

    if (method === "GET" && path in staticFiles) {
      const asset = staticFiles[path as keyof typeof staticFiles];
      const content = readFileSync(resolve(process.cwd(), asset.file));
      response.writeHead(200, securityHeaders(asset.contentType));
      response.end(content);
      return;
    }

    if (method === "POST" && path === "/api/chat") {
      try {
        const requestBody = ChatRequestSchema.parse(await readJson(request));
        const backendStartedAt = performance.now();
        const result = await backendClient.sendMessage(requestBody.message);
        const backendElapsedMs = Math.round(performance.now() - backendStartedAt);

        const responseBody = {
          traceId: result.traceId,
          answer: result.answer,
          intent: result.intent,
          decision: result.decision,
          requiresHuman: result.requiresHuman,
          diagnostic: {
            ...result.diagnostic,
            backendElapsedMs,
          },
        };

        sendJson(response, 200, responseBody);
        logger({
          event: "ui.request.completed",
          method,
          path,
          status: 200,
          traceId: result.traceId,
          policyAction: result.decision,
          responseSource: result.diagnostic.responseSource,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        const tooLarge = error instanceof Error && error.message === "REQUEST_TOO_LARGE";
        const invalid = error instanceof SyntaxError || error instanceof ZodError || tooLarge;
        const status = invalid ? (tooLarge ? 413 : 400) : 502;

        sendJson(response, status, {
          error: invalid ? (tooLarge ? "REQUEST_TOO_LARGE" : "INVALID_REQUEST") : "BACKEND_UNAVAILABLE",
          message: invalid
            ? "Enter a message between 1 and 1,000 characters."
            : "The assistant is temporarily unavailable. Please try again.",
        });
        logger({
          event: "ui.request.rejected",
          method,
          path,
          status,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }
      return;
    }

    sendJson(response, 404, { error: "NOT_FOUND" });
  });
}
