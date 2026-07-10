import { test, expect, spyOn } from 'bun:test';
import type { ExecPayload } from "../schema.js";
import { systemInterceptor } from "../interceptors/system-interceptor.js";



test("systemInterceptor - rewrites node -e execution natively", () => {
  const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
  const args = ["-e", "console.log('test')"];
  const context = {
    cmdBasename: "node",
    args,
    envOverrides: {},
    payload: { type: "command", command: "node", args } as unknown as ExecPayload,
  };

  systemInterceptor(context);
  expect(context.args.length).toBe(1);
  expect(context.args[0]).toMatch(/agent_inline_script_.*\.js$/);
  
  consoleSpy.mockRestore();
});

test("systemInterceptor - rewrites node -p execution natively", () => {
  const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
  const args = ["-p", "console.log('test')"];
  const context = {
    cmdBasename: "node",
    args,
    envOverrides: {},
    payload: { type: "command", command: "node", args } as unknown as ExecPayload,
  };

  systemInterceptor(context);
  expect(context.args.length).toBe(1);
  expect(context.args[0]).toMatch(/agent_inline_script_.*\.js$/);
  
  consoleSpy.mockRestore();
});

test("systemInterceptor - rewrites python -c execution natively", () => {
  const consoleSpy = spyOn(console, "error").mockImplementation(() => {});
  const args = ["-c", "print('test')"];
  const context = {
    cmdBasename: "python",
    args,
    envOverrides: {},
    payload: { type: "command", command: "python", args } as unknown as ExecPayload,
  };

  systemInterceptor(context);
  expect(context.args.length).toBe(1);
  expect(context.args[0]).toMatch(/agent_inline_script_.*\.py$/);
  
  consoleSpy.mockRestore();
});
