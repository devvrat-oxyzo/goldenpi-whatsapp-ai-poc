import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloud Run packaging", () => {
  it("starts the prebuilt application without requiring development dependencies", () => {
    const procfile = readFileSync("Procfile", "utf8").trim();

    expect(procfile).toBe("web: node dist/src/server.js");
    expect(procfile).not.toContain("npm run build");
  });
});
