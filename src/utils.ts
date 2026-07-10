import type { z } from 'zod';
import type { DurableObjectListOptions } from '@cloudflare/workers-types';
import { ALGO_SHA256, HTTP_STATUS, SYSTEM_KEY_PREFIX } from './constants';
import { AdminError } from './errors';
import type { SqlStorageBackend } from './types';

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(', ');
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  
  const hashA = await crypto.subtle.digest(ALGO_SHA256, encoder.encode(a));
  const hashB = await crypto.subtle.digest(ALGO_SHA256, encoder.encode(b));
  
  const arrayA = new Uint8Array(hashA);
  const arrayB = new Uint8Array(hashB);
  
  let result = 0;
  for (let i = 0; i < arrayA.length; i++) {
    result |= arrayA[i] ^ arrayB[i];
  }
  return result === 0;
}

export async function parseBody<T>(request: Request, schema: z.ZodType<T>, errorMessage: string): Promise<T> {
  try {
    const rawBody = await request.json();
    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AdminError(`${errorMessage}: ${formatZodError(parsed.error)}`, HTTP_STATUS.BAD_REQUEST);
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof AdminError) {
      throw error;
    }
    throw new AdminError(errorMessage, HTTP_STATUS.BAD_REQUEST);
  }
}

export function parseQuery<T>(url: URL, schema: z.ZodType<T>, errorMessage: string): T {
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new AdminError(`${errorMessage}: ${formatZodError(parsed.error)}`, HTTP_STATUS.BAD_REQUEST);
  }
  return parsed.data;
}

export function hasSqlBackend(
  storage: unknown,
): storage is { sql: SqlStorageBackend } {
  return (
    typeof storage === "object" &&
    storage !== null &&
    "sql" in storage &&
    typeof storage.sql === "object" &&
    storage.sql !== null &&
    "exec" in storage.sql &&
    typeof storage.sql.exec === "function"
  );
}

export function isSystemKey(key: string): boolean {
  return key.startsWith(SYSTEM_KEY_PREFIX);
}

export function buildListOptions(limit: number, cursor?: string): DurableObjectListOptions {
  const options: DurableObjectListOptions = { limit };
  if (cursor) {
    options.startAfter = cursor;
  }
  return options;
}
