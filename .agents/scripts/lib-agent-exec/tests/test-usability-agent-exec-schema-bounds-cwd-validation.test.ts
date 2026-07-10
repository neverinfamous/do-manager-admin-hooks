import { describe, expect, it } from 'bun:test';
import { PayloadSchema } from '../schema.js';
import type { ZodIssue } from 'zod';

describe('PayloadSchema - cwd validation', () => {
  it('should reject a number for cwd', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: 12345
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const cwdError = result.error.issues.find((e: ZodIssue) => e.path.includes('cwd'));
      expect(cwdError).toBeDefined();
      expect(cwdError?.code).toBe('invalid_type');
    }
  });

  it('should reject an object for cwd', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: { path: '/tmp' }
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const cwdError = result.error.issues.find((e: ZodIssue) => e.path.includes('cwd'));
      expect(cwdError).toBeDefined();
      expect(cwdError?.code).toBe('invalid_type');
    }
  });

  it('should accept a valid string for cwd', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: '/tmp/valid-path'
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject a cwd with null bytes', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: '/tmp/path\0'
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const cwdError = result.error.issues.find((e: ZodIssue) => e.path.includes('cwd'));
      expect(cwdError).toBeDefined();
      expect(cwdError?.message).toContain('null bytes');
    }
  });

  it('should reject a cwd with carriage returns', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: '/tmp/path\r'
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const cwdError = result.error.issues.find((e: ZodIssue) => e.path.includes('cwd'));
      expect(cwdError).toBeDefined();
      expect(cwdError?.message).toContain('carriage returns');
    }
  });

  it('should reject a cwd with BOMs', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: '/tmp/path\uFEFF'
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const cwdError = result.error.issues.find((e: ZodIssue) => e.path.includes('cwd'));
      expect(cwdError).toBeDefined();
      expect(cwdError?.message).toContain('BOMs');
    }
  });

  it('should reject a cwd exceeding 1024 characters', () => {
    const payload = {
      type: 'command',
      command: 'echo hello',
      cwd: 'a'.repeat(1025)
    };

    const result = PayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);

    if (!result.success) {
      const cwdError = result.error.issues.find((e: ZodIssue) => e.path.includes('cwd'));
      expect(cwdError).toBeDefined();
      expect(cwdError?.code).toBe('too_big');
    }
  });
});
