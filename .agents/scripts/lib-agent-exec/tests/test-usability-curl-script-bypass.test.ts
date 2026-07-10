import { expect, test, describe } from "bun:test";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const payloadPath = path.join(os.tmpdir(), `test-curl-script-bypass-${Date.now()}.json`);
const agentExecPath = path.resolve(__dirname, "../../agent-exec.ts");

describe("Usability Test: Agent-Exec Hallucinations (Network aliases bypass)", () => {
  test("Intercepts 'curl' alias within a 'script' payload type", () => {
    const scriptPath = path.join(os.tmpdir(), `test-curl-script-${Date.now()}.ps1`);
    fs.writeFileSync(scriptPath, "curl https://example.com");

    const payload = {
      type: "script",
      interpreter: "pwsh",
      scriptPath: scriptPath,
      timeoutMs: 5000,
      expectJsonEnvelope: false
    };
    fs.writeFileSync(payloadPath, JSON.stringify(payload));

    try {
      execSync(`bun ${agentExecPath} ${payloadPath}`, { encoding: "utf8", stdio: 'pipe' });
      throw new Error("agent-exec should have failed and thrown an interceptor error, but it succeeded or executed the script.");
    } catch (err: unknown) {
      const errorObj = err as { status?: number, stderr?: string, stdout?: string };
      const output = (errorObj.stderr || "") + "\n" + (errorObj.stdout || "");
      
      expect(errorObj.status).not.toBe(0);
      expect(output).toContain("read_url_content");
      expect(output).toContain("curl.exe");
      expect(output).toContain("AUTONOMOUS HEALING");
    } finally {
      if (fs.existsSync(payloadPath)) fs.unlinkSync(payloadPath);
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    }
  });
});
