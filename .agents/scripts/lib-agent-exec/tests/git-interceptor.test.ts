import { expect, test, afterEach, beforeEach } from "bun:test";
import { gitInterceptor } from "../interceptors/git-interceptor.ts";
import { ExecutionContext } from "../interceptors/types.ts";

const originalExit = process.exit;
const originalConsoleError = console.error;

beforeEach(() => {
  process.exit = ((code: number) => {
    throw new Error(`process.exit called with code ${code}`);
  }) as unknown as typeof process.exit;
});

afterEach(() => {
  process.exit = originalExit;
  console.error = originalConsoleError;
});

test("gitInterceptor transparently rewrites git commit", () => {
  const ctx: ExecutionContext = {
    cmdBasename: "git",
    args: ["commit", "-m", "chore: bypass commit wrapper"],
    payload: { type: "command", command: "git commit -m \"chore: bypass commit wrapper\"" },
    envOverrides: {},
  };
  
  let errorOutput = "";
  console.error = (msg: string) => {
    errorOutput += msg + "\n";
  };

  gitInterceptor(ctx);
  expect(ctx.cmdBasename).toBe("bun");
  expect(ctx.args).toEqual([
    ".\\.agents\\scripts\\commit.ts", 
    "--msg", 
    "chore: bypass commit wrapper", 
    "--impact", 
    "0.5", 
    "--confidence", 
    "0.5", 
    "--validation", 
    "passed"
  ]);
  expect(errorOutput).toContain("Transparently rewriting");
});

test("gitInterceptor transparently rewrites history commands to get-git-history-json.ts", () => {
  const historyCmds = ["log", "shortlog", "show"];
  for (const cmd of historyCmds) {
    const ctx: ExecutionContext = {
      cmdBasename: "git",
      args: [cmd],
      payload: { type: "command", command: `git ${cmd}` },
      envOverrides: {},
    };

    let errorOutput = "";
    console.error = (msg: string) => {
      errorOutput += msg + "\n";
    };

    gitInterceptor(ctx);
    expect(ctx.cmdBasename).toBe("bun");
    expect(ctx.args).toContain(".\\.agents\\scripts\\get-git-history-json.ts");
    expect(errorOutput).toContain("Transparently rewriting");
  }
});

test("gitInterceptor blocks compound history commands like git stash show", () => {
  const ctx: ExecutionContext = {
    cmdBasename: "git",
    args: ["stash", "show"],
    payload: { type: "command", command: "git stash show" },
    envOverrides: {},
  };

  let errorOutput = "";
  console.error = (msg: string) => {
    errorOutput += msg + "\n";
  };

  expect(() => gitInterceptor(ctx)).toThrow("process.exit called with code 1");
  expect(errorOutput).toContain("bun .\\.agents\\scripts\\get-git-history-json.ts");
});
