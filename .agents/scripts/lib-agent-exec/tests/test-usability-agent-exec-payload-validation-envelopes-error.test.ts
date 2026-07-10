function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null;
}

import { expect, test, describe } from "bun:test";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

describe("Agent-Exec JSON output on invalid payload", () => {
  const scratchDir = __dirname;
  const scriptPath = path.resolve(__dirname, "../../agent-exec.ts");

  test("should output a JSON envelope when `--json` is provided and payload is invalid JSON", () => {
    const payloadPath = path.join(scratchDir, `malformed-test-${crypto.randomUUID()}.json`);
    fs.writeFileSync(payloadPath, "{ invalid json }");
    try {
      execSync(`bun ${scriptPath} --json ${payloadPath}`, { encoding: "utf-8", stdio: "pipe" });
      expect().fail("Should have exited with code 1");
    } catch (err: unknown) {
      expect((isRecord(err) ? err.status : undefined)).toBe(1);
      const stdout = (isRecord(err) && typeof err.stdout === "string" ? err.stdout : "");
      let parsed = false;
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        try {
          const json = JSON.parse(line.trim());
          if (json.status === "error") {
            expect(json.message).toBeDefined();
            parsed = true;
          }
        } catch { /* ignore */ }
      }
      expect(parsed).toBe(true);
    } finally {
      if (fs.existsSync(payloadPath)) {
        fs.unlinkSync(payloadPath);
      }
    }
  });

  test("should output a JSON envelope when `--json` is provided and payload schema is invalid", () => {
    const payloadPath = path.join(scratchDir, `malformed-test-${crypto.randomUUID()}.json`);
    fs.writeFileSync(payloadPath, JSON.stringify({ type: "command" }));
    try {
      execSync(`bun ${scriptPath} --json ${payloadPath}`, { encoding: "utf-8", stdio: "pipe" });
      expect().fail("Should have exited with code 1");
    } catch (err: unknown) {
      expect((isRecord(err) ? err.status : undefined)).toBe(1);
      const stdout = (isRecord(err) && typeof err.stdout === "string" ? err.stdout : "");
      let parsed = false;
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        try {
          const json = JSON.parse(line.trim());
          if (json.status === "error") {
            expect(json.message).toContain("Payload schema validation failed");
            parsed = true;
          }
        } catch { /* ignore */ }
      }
      expect(parsed).toBe(true);
    } finally {
      if (fs.existsSync(payloadPath)) {
        fs.unlinkSync(payloadPath);
      }
    }
  });
});
