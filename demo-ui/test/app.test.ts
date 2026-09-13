import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatBackendClient } from "../src/backend-client.js";
import { createDemoApp, type SafeUiLog } from "../src/app.js";

const servers: ReturnType<typeof createDemoApp>[] = [];

async function start(client: ChatBackendClient, logs: SafeUiLog[] = []) {
  const server = createDemoApp(client, (event) => logs.push(event));
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
});

const approvedResponse = {
  traceId: "4e05cf9a-8d88-4e2d-a5bd-36137c6821af",
  intent: "PUBLIC_INFORMATION",
  decision: "ALLOW_AI_RESPONSE",
  answer: "Synthetic answer that must not appear in logs.",
  requiresHuman: false,
  diagnostic: {
    reason: "PUBLIC_INFORMATION_ALLOWED",
    customerDataAccessed: false,
    responseSource: "TEST",
    promptVersion: "1.0.0",
  },
};

describe("hosted demo UI", () => {
  it("serves the responsive UI with defensive browser headers", async () => {
    const client = { sendMessage: vi.fn() } as unknown as ChatBackendClient;
    const origin = await start(client);
    const response = await fetch(`${origin}/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("GoldenPi Assistant Lab");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("reports a healthy UI service", async () => {
    const client = { sendMessage: vi.fn() } as unknown as ChatBackendClient;
    const origin = await start(client);
    const response = await fetch(`${origin}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", service: "goldenpi-chat-demo" });
  });

  it("returns safe diagnostics and excludes message and answer from logs", async () => {
    const logs: SafeUiLog[] = [];
    const client: ChatBackendClient = { sendMessage: vi.fn().mockResolvedValue(approvedResponse) };
    const origin = await start(client, logs);
    const secretMessage = "synthetic message not for logs";
    const response = await fetch(`${origin}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: secretMessage }),
    });

    expect(response.status).toBe(200);
    expect(client.sendMessage).toHaveBeenCalledWith(secretMessage);
    expect(await response.json()).toMatchObject({
      answer: approvedResponse.answer,
      decision: "ALLOW_AI_RESPONSE",
      diagnostic: { responseSource: "TEST", customerDataAccessed: false },
    });
    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain(secretMessage);
    expect(serializedLogs).not.toContain(approvedResponse.answer);
    expect(logs).toEqual([
      expect.objectContaining({
        event: "ui.request.completed",
        status: 200,
        traceId: approvedResponse.traceId,
        policyAction: "ALLOW_AI_RESPONSE",
      }),
    ]);
  });

  it("rejects an invalid request without calling the backend", async () => {
    const client: ChatBackendClient = { sendMessage: vi.fn() };
    const origin = await start(client);
    const response = await fetch(`${origin}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    });

    expect(response.status).toBe(400);
    expect(client.sendMessage).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: "INVALID_REQUEST" });
  });

  it("does not expose backend failures", async () => {
    const client: ChatBackendClient = {
      sendMessage: vi.fn().mockRejectedValue(new Error("sensitive upstream detail")),
    };
    const origin = await start(client);
    const response = await fetch(`${origin}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is a bond?" }),
    });

    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).toContain("BACKEND_UNAVAILABLE");
    expect(text).not.toContain("sensitive upstream detail");
  });
});
