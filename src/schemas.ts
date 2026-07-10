import { z } from 'zod';
import { MAX_LIST_LIMIT, MAX_IMPORT_KEYS, ERROR_MESSAGES, MAX_KEY_BYTES, MAX_SQL_QUERY_LENGTH, MAX_CURSOR_LENGTH } from './constants';

export const PutPayloadSchema: z.ZodType<{ key: string; value: unknown }> = z.object({
  key: z.string().min(1, 'Key cannot be empty').refine(val => new TextEncoder().encode(val).length <= MAX_KEY_BYTES, `Key cannot exceed ${MAX_KEY_BYTES} bytes`),
  value: z.unknown().refine((val) => val !== undefined, 'Value cannot be undefined'),
});

export const DeletePayloadSchema: z.ZodType<{ key: string }> = z.object({
  key: z.string().min(1, 'Key cannot be empty').refine(val => new TextEncoder().encode(val).length <= MAX_KEY_BYTES, `Key cannot exceed ${MAX_KEY_BYTES} bytes`),
});

export const SqlPayloadSchema: z.ZodType<{ query: string }> = z.object({
  query: z.string().min(1, 'Query cannot be empty').max(MAX_SQL_QUERY_LENGTH, 'Query too large'),
});

export const AlarmPayloadSchema: z.ZodType<{ timestamp: number }> = z.object({
  timestamp: z.number().int().nonnegative(),
});

export const ImportPayloadSchema: z.ZodType<{ data: Record<string, unknown> }> = z.object({
  data: z.record(
    z.string().min(1, 'Key cannot be empty').refine(val => new TextEncoder().encode(val).length <= MAX_KEY_BYTES, `Key cannot exceed ${MAX_KEY_BYTES} bytes`), 
    z.unknown().refine((val) => val !== undefined, 'Value cannot be undefined')
  ).refine((data) => Object.keys(data).length <= MAX_IMPORT_KEYS, {
    message: ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
  }),
});

export const QuerySchema: z.ZodType<{ limit?: number; cursor?: string }> = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  cursor: z.string().max(MAX_CURSOR_LENGTH, 'Cursor too large').optional(),
});

export const GetQuerySchema: z.ZodType<{ key: string }> = z.object({
  key: z.string().min(1, 'Key cannot be empty').refine(val => new TextEncoder().encode(val).length <= MAX_KEY_BYTES, `Key cannot exceed ${MAX_KEY_BYTES} bytes`),
});

export const SqlFreezeRowSchema: z.ZodType<{ key: string; value: string }> = z.object({
  key: z.string(),
  value: z.string(),
});

export const SqlTableSchema: z.ZodType<{ name: string }> = z.object({
  name: z.string(),
});
