import { z } from 'zod';
import { MAX_LIST_LIMIT, MAX_IMPORT_KEYS, ERROR_MESSAGES } from './constants';

export const PutPayloadSchema: z.ZodType<{ key: string; value: unknown }> = z.object({
  key: z.string().min(1, 'Key cannot be empty'),
  value: z.unknown(),
});

export const DeletePayloadSchema: z.ZodType<{ key: string }> = z.object({
  key: z.string().min(1, 'Key cannot be empty'),
});

export const SqlPayloadSchema: z.ZodType<{ query: string }> = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
});

export const AlarmPayloadSchema: z.ZodType<{ timestamp: number }> = z.object({
  timestamp: z.number().int().nonnegative(),
});

export const ImportPayloadSchema: z.ZodType<{ data: Record<string, unknown> }> = z.object({
  data: z.record(z.string(), z.unknown()).refine((data) => Object.keys(data).length <= MAX_IMPORT_KEYS, {
    message: ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
  }),
});

export const QuerySchema: z.ZodType<{ limit?: number; cursor?: string }> = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  cursor: z.string().optional(),
});

export const GetQuerySchema: z.ZodType<{ key: string }> = z.object({
  key: z.string().min(1, 'Key cannot be empty'),
});

export const SqlFreezeRowSchema: z.ZodType<{ key: string; value: string }> = z.object({
  key: z.string(),
  value: z.string(),
});

export const SqlTableSchema: z.ZodType<{ name: string }> = z.object({
  name: z.string(),
});
