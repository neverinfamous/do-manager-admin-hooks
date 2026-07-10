import { z } from 'zod';
import { MAX_LIST_LIMIT, MAX_IMPORT_KEYS, ERROR_MESSAGES, MAX_KEY_BYTES, MAX_SQL_QUERY_LENGTH, MAX_CURSOR_LENGTH } from './constants';

export const StorageKeySchema: z.ZodType<string> = z.string()
  .min(1, ERROR_MESSAGES.KEY_EMPTY)
  .refine(
    val => new TextEncoder().encode(val).length <= MAX_KEY_BYTES, 
    ERROR_MESSAGES.KEY_TOO_LARGE
  );

export const PutPayloadSchema: z.ZodType<{ key: string; value: unknown }> = z.object({
  key: StorageKeySchema,
  value: z.unknown().refine((val) => val !== undefined, ERROR_MESSAGES.VALUE_UNDEFINED),
});

export const DeletePayloadSchema: z.ZodType<{ key: string }> = z.object({
  key: StorageKeySchema,
});

export const SqlPayloadSchema: z.ZodType<{ query: string }> = z.object({
  query: z.string().min(1, ERROR_MESSAGES.QUERY_EMPTY).max(MAX_SQL_QUERY_LENGTH, ERROR_MESSAGES.QUERY_TOO_LARGE),
});

export const AlarmPayloadSchema: z.ZodType<{ timestamp: number }> = z.object({
  timestamp: z.number().int().nonnegative(),
});

export const ImportPayloadSchema: z.ZodType<{ data: Record<string, unknown> }> = z.object({
  data: z.record(
    StorageKeySchema, 
    z.unknown().refine((val) => val !== undefined, ERROR_MESSAGES.VALUE_UNDEFINED)
  ).refine((data) => Object.keys(data).length <= MAX_IMPORT_KEYS, {
    message: ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
  }),
});

export const QuerySchema: z.ZodType<{ limit?: number; cursor?: string }> = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  cursor: z.string().max(MAX_CURSOR_LENGTH, ERROR_MESSAGES.CURSOR_TOO_LARGE).optional(),
});

export const GetQuerySchema: z.ZodType<{ key: string }> = z.object({
  key: StorageKeySchema,
});

export const SqlFreezeRowSchema: z.ZodType<{ key: string; value: string }> = z.object({
  key: z.string(),
  value: z.string(),
});

export const SqlTableSchema: z.ZodType<{ name: string }> = z.object({
  name: z.string(),
});
