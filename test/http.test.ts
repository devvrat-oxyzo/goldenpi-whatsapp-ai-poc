import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  type SafeLogger,
  writeSafeLog,
} from "../src/http/app.js";

const fixturePath = new URL(
  "../fixtures/public-bond-question.json",
  import.meta.url,
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("HTTP API", () => {
  const logs: Parameters<SafeLogger>[0][] = [];
  const server = createApp((event) => logs.push(event));
  let baseUrl: string;

  beforeEach(async () => {
    logs.length = 0;
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("reports service health", async () => {
    const response = await fetch(`${baseUrl}/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  it("returns the fixed POC bond answer through the approved policy", async () => {
    const response = await fetch(`${baseUrl}/v1/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fixture.inbound),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      traceId: fixture.inbound.traceId,
      intent: "PUBLIC_INFORMATION",
      decision: "ALLOW_AI_RESPONSE",
      requiresHuman: false,
      diagnostic: {
        customerDataAccessed: false,
        responseSource: "POC_FIXED",
      },
    });
  });

  it("rejects invalid normalized messages", async () => {
    const response = await fetch(`${baseUrl}/v1/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "What is a bond?" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "INVALID_REQUEST",
    });
  });

  it("does not write message text or sender details to safe logs", async () => {
    await fetch(`${baseUrl}/v1/simulate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fixture.inbound),
    });

    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs).not.toContain(fixture.inbound.content.text);
    expect(serializedLogs).not.toContain(fixture.inbound.sender.externalId);
    expect(logs.at(-1)).toMatchObject({
      traceId: fixture.inbound.traceId,
      policyAction: "ALLOW_AI_RESPONSE",
    });
  });

  it("writes each default log event as one JSON line", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const event = {
      event: "request.completed" as const,
      method: "POST",
      path: "/v1/simulate",
      status: 200,
      traceId: fixture.inbound.traceId,
      policyAction: "ALLOW_AI_RESPONSE",
      elapsedMs: 11,
    };

    writeSafeLog(event);

    expect(consoleInfo).toHaveBeenCalledOnce();
    expect(consoleInfo).toHaveBeenCalledWith(JSON.stringify(event));
    consoleInfo.mockRestore();
  });

  it("returns 404 for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/unknown`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "NOT_FOUND" });
  });
});
