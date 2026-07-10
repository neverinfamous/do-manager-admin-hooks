import { expect, test, describe } from "bun:test";
import { buildCommand } from "../command-builder.js";
import { ExecPayload } from "../schema.js";

describe("Agent-Exec Payloads - Command", () => {
  test("properly extracts command and args from a single command string", () => {
    const payload: ExecPayload = {
      type: "command",
      command: "echo",
      args: ["'hello world'"]
    };
    
    const { cmd, args } = buildCommand(payload, process.cwd());
    
    if (process.platform === 'win32' && cmd.toLowerCase().includes('pwsh')) {
       expect(cmd.toLowerCase()).toContain('pwsh');
       const encodedCmd = args[args.indexOf('-EncodedCommand') + 1];
       const decoded = Buffer.from(encodedCmd, 'base64').toString('utf16le');
       expect(decoded).toContain('echo');
       expect(decoded).toContain('hello world');
    } else {
       expect(cmd).toContain("echo");
       expect(args).toEqual(["'hello world'"]);
    }
  });

  test("prepends tokenized args to explicit args array when command has quotes", () => {
    const payload: ExecPayload = {
      type: "command",
      command: "\"C:\\Program Files\\git\\bin\\git.exe\" status",
      args: ["-s"]
    };
    
    const { cmd, args } = buildCommand(payload, process.cwd());
    expect(cmd.toLowerCase()).toContain("git.exe");
    expect(args).toEqual(["--no-pager", "status", "-s"]);
  });

  test("maintains wsl2 execution when target is wsl2", () => {
    const payload: ExecPayload = {
      type: "command",
      command: "uname",
      args: ["-a"],
      target: "wsl2"
    };
    
    const { cmd, args } = buildCommand(payload, process.cwd());
    expect(cmd.toLowerCase()).toContain("wsl");
    expect(args).toContain("uname");
    expect(args).toContain("-a");
  });
});
