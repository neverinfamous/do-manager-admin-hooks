import { expect, test, describe } from "bun:test";
import { PayloadSchema } from "../schema.js";

describe("Payload Validation - code bounds", () => {
  test("should reject code payload exceeding 10MB limit", () => {
    // Create an 11MB string
    const massiveCode = "a".repeat(11 * 1024 * 1024);
    const payload = {
      type: "eval",
      code: massiveCode,
      interpreter: "node",
    };
    
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test("should reject empty code payload", () => {
    const payload = {
      type: "eval",
      code: "   \n\t  ",
      interpreter: "node",
    };
    
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test("should reject code payload with null bytes", () => {
    const payload = {
      type: "eval",
      code: "console.log('hello \0 world');",
      interpreter: "node",
    };
    
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  test("should allow code payload with carriage returns and BOMs", () => {
    const payload = {
      type: "eval",
      code: "\uFEFFconsole.log('hello\r\nworld');",
      interpreter: "node",
    };
    
    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
