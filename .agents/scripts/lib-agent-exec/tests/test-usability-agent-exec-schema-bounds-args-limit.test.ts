import { describe, expect, it } from 'bun:test';
import { PayloadSchema } from '../schema.js';
import type { ZodIssue } from 'zod';

describe('PayloadSchema - args bounds', () => {
  it('should reject args array with more than 1000 elements', () => {
    const payload = {
      type: 'command',
      command: 'echo',
      args: Array.from({ length: 1001 }, (_, i) => `arg${i}`)
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const argsError = result.error.issues.find((e: ZodIssue) => e.path.includes('args') && e.code === 'too_big');
      expect(argsError).toBeDefined();
    }
  });

  it('should accept args array with 1000 elements', () => {
    const payload = {
      type: 'command',
      command: 'echo',
      args: Array.from({ length: 1000 }, (_, i) => `arg${i}`)
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
