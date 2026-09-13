import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app.js";
import { UnsupportedProviderMessageError } from "../src/providers/provider-adapter.js";
import { watiAdapter } from "../src/providers/wati/wati-adapter.js";

const fixturePath = new URL(
  "../fixtures/wati-message-received.json",
  import.meta.url,
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

describe("WATI adapter", () => {
  it("normalizes a WATI text webhook without retaining the raw phone number", () => {
    const inbound = watiAdapter.normalize(fixture);

    expect(inbound).toMatchObject({
      provider: "wati",
      providerMessageId: fixture.whatsappMessageId,
      channel: "whatsapp",
      content: { type: "text", text: "What is a bond?" },
      authentication: { level: "ANONYMOUS" },
    });
    expect(inbound.sender.externalId).not.toContain(fixture.waId);
    expect(inbound.sender.phoneE164).toBeUndefined();
  });

  it("rejects non-text WATI messages for this checkpoint", () => {
    expect(() => watiAdapter.normalize({ ...fixture, type: "image" })).toThrow(
      UnsupportedProviderMessageError,
    );
  });
});

describe("WATI webhook endpoint", () => {
  const server = createApp(() => undefined);
  let baseUrl: string;

  beforeEach(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("acknowledges and processes a WATI text webhook", async () => {
    const response = await fetch(`${baseUrl}/v1/providers/wati/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fixture),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      accepted: true,
      providerMessageId: fixture.whatsappMessageId,
      result: {
        intent: "PUBLIC_INFORMATION",
        decision: "ALLOW_AI_RESPONSE",
        requiresHuman: false,
      },
    });
  });

  it("rejects malformed WATI payloads", async () => {
    const response = await fetch(`${baseUrl}/v1/providers/wati/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventType: "message", text: "Hello" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "INVALID_PROVIDER_PAYLOAD",
    });
  });
});
