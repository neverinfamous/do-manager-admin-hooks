import { expect, test, describe } from "bun:test";
import { PayloadSchema } from "../schema.js";

describe("Agent-Exec Payload Validation - Command", () => {
  test("rejects empty command string", () => {
    const payload = {
      type: "command",
      command: ""
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("command must not be empty");
    }
  });

  test("rejects whitespace-only command string", () => {
    const payload = {
      type: "command",
      command: "   "
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
  
  test("rejects missing command field", () => {
    const payload = {
      type: "command"
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test("accepts valid command string", () => {
    const payload = {
      type: "command",
      command: "echo hello"
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  test("rejects command containing null bytes", () => {
    const payload = {
      type: "command",
      command: "echo hello\0"
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Must not contain null bytes");
    }
  });

  test("rejects command containing carriage returns", () => {
    const payload = {
      type: "command",
      command: "echo hello\rworld"
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Must not contain carriage returns");
    }
  });

  test("rejects command containing BOMs", () => {
    const payload = {
      type: "command",
      command: "\uFEFFecho hello"
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Must not contain BOMs");
    }
  });

  test("rejects command of wrong type (number)", () => {
    const payload = {
      type: "command",
      command: 123
    };
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
