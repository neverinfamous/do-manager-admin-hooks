function isRecord(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === "object" && obj !== null;
}

import { expect, test, describe } from "bun:test";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

describe("Agent-Exec JSON Envelope Integration", () => {
  const scratchDir = __dirname;
  const scriptPath = path.resolve(__dirname, "../../agent-exec.ts");
  
  test("should override exit code on success envelope and strip it from output", () => {
    const code = `console.log('some normal logging');\nconsole.log(JSON.stringify({ status: 'success', exit_code: 0, data: { foo: 'bar' } }));\nprocess.exit(1);`;
    const payloadPath = path.join(scratchDir, `envelope-integration-payload-${crypto.randomUUID()}.json`);
    fs.writeFileSync(payloadPath, JSON.stringify({
      type: "eval",
      code,
      interpreter: "node",
      expectJsonEnvelope: true
    }));

    try {
      const stdout = execSync(`bun ${scriptPath} ${payloadPath}`, { encoding: "utf-8", stdio: "pipe" });
      const parsed = JSON.parse(stdout.trim());
      
      expect(parsed.code).toBe(0);
      expect(parsed.status).toBe("success");
      expect(parsed.stdout).toContain("some normal logging");
      expect(parsed.stdout).not.toContain('"status":"success"');
      expect(parsed.stdout).not.toContain("exit_code");
      
      expect(parsed.envData).toBeDefined();
      expect(parsed.envData.status).toBe("success");
      expect(parsed.envData.exit_code).toBe(0);
      expect(parsed.envData.data.foo).toBe("bar");
    } catch (err: unknown) {
      expect().fail("Should have exited with code 0. Error: " + err);
    } finally {
      if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
    }
  }, 15000);

  test("should override exit code on error envelope and strip it from output", () => {
    const code = `console.log('some normal logging');\nconsole.log(JSON.stringify({ status: 'error', exit_code: 42, data: {} }));\nprocess.exit(0);`;
    const payloadPath = path.join(scratchDir, `envelope-integration-payload-${crypto.randomUUID()}.json`);
    fs.writeFileSync(payloadPath, JSON.stringify({
      type: "eval",
      code,
      interpreter: "node",
      expectJsonEnvelope: true
    }));

    try {
      execSync(`bun ${scriptPath} ${payloadPath}`, { encoding: "utf-8", stdio: "pipe" });
      expect().fail("Should have exited with code 42");
    } catch (err: unknown) {
      expect((isRecord(err) ? err.status : undefined)).toBe(42);
      const stdout = (isRecord(err) && typeof err.stdout === "string" ? err.stdout : "");
      const parsed = JSON.parse(stdout.trim());
      
      expect(parsed.code).toBe(42);
      expect(parsed.status).toBe("error");
      expect(parsed.stdout).toContain("some normal logging");
      expect(parsed.stdout).not.toContain('"status":"error"');
      
      expect(parsed.envData).toBeDefined();
      expect(parsed.envData.status).toBe("error");
      expect(parsed.envData.exit_code).toBe(42);
    } finally {
      if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
    }
  }, 15000);

  test("should fallback to native exit code on malformed envelope", () => {
    const code = `console.log('some normal logging');\nconsole.log('{"status": "success", "exit_code": 0, "data": { broken }');\nprocess.exit(5);`;
    const payloadPath = path.join(scratchDir, `envelope-integration-payload-${crypto.randomUUID()}.json`);
    fs.writeFileSync(payloadPath, JSON.stringify({
      type: "eval",
      code,
      interpreter: "node",
      expectJsonEnvelope: true
    }));

    try {
      execSync(`bun ${scriptPath} ${payloadPath}`, { encoding: "utf-8", stdio: "pipe" });
      expect().fail("Should have exited with code 5");
    } catch (err: unknown) {
      expect((isRecord(err) ? err.status : undefined)).toBe(5);
      const stdout = (isRecord(err) && typeof err.stdout === "string" ? err.stdout : "");
      const parsed = JSON.parse(stdout.trim());
      
      expect(parsed.code).toBe(5);
      expect(parsed.status).toBe("error");
      expect(parsed.stdout).toContain("some normal logging");
      expect(parsed.stdout).toContain("broken");
      expect(parsed.envData).toBeNull();
    } finally {
      if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
    }
  }, 15000);
});
