import { describe, expect, test } from "bun:test";
import { buildCommand } from "../command-builder.js";
import { ExecPayload } from "../schema.js";

describe("WSL Regex Quoting and Sanitization", () => {
  test("strips unnecessary wrapping quotes for grep pattern in wsl2", () => {
    const payload: ExecPayload = {
      type: "command",
      target: "wsl2",
      command: "grep",
      args: ["-E", '"^foo$"', "file.txt"]
    };
    
    // Test that the wrapping double quotes are stripped and -E is converted to -P with \r?$
    const result = buildCommand(payload, process.cwd());
    
    const argsStr = result.args.join(' ');
    expect(result.cmd).toBe("wsl.exe");
    expect(argsStr).toContain("-P");
    expect(argsStr).toContain("^foo\\r?$");
  });

  test("strips unnecessary wrapping single quotes for rg pattern in wsl2", () => {
    const payload: ExecPayload = {
      type: "command",
      target: "wsl2",
      command: "rg",
      args: ["'^foo$'", "file.txt"]
    };
    
    const result = buildCommand(payload, process.cwd());
    
    const argsStr = result.args.join(' ');
    expect(result.cmd).toBe("wsl.exe");
    expect(argsStr).toContain("-P");
    expect(argsStr).toContain("^foo\\r?$");
  });
});
