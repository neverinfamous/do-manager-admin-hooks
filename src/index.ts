import { z } from 'zod';
import { match } from 'ts-pattern';
import type { 
  DurableObjectState, 
  DurableObjectListOptions 
} from '@cloudflare/workers-types';

/**
 * @do-manager/admin-hooks
 *
 * Admin hooks for Cloudflare Durable Objects that enable integration with DO Manager.
 *
 * @example
 * ```typescript
 * import { withAdminHooks } from '@do-manager/admin-hooks';
 *
 * export class MyDurableObject extends withAdminHooks() {
 *   // Your existing methods...
 * }
 * ```
 */

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Hashes both strings via Web Crypto before comparing to prevent length-leaking.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  
  const hashA = await crypto.subtle.digest('SHA-256', encoder.encode(a));
  const hashB = await crypto.subtle.digest('SHA-256', encoder.encode(b));
  
  const arrayA = new Uint8Array(hashA);
  const arrayB = new Uint8Array(hashB);
  
  let result = 0;
  for (let i = 0; i < arrayA.length; i++) {
    result |= arrayA[i] ^ arrayB[i];
  }
  return result === 0;
}

class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const DEFAULT_LIST_LIMIT = 1000;
const MAX_LIST_LIMIT = 5000;

const PutPayloadSchema = z.object({
  key: z.string().min(1, 'Key cannot be empty'),
  value: z.unknown(),
});

const DeletePayloadSchema = z.object({
  key: z.string().min(1, 'Key cannot be empty'),
});

const SqlPayloadSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
});

const AlarmPayloadSchema = z.object({
  timestamp: z.number().int().nonnegative(),
});

const ImportPayloadSchema = z.object({
  data: z.record(z.string(), z.unknown()).refine((data) => Object.keys(data).length <= 10000, {
    message: "Payload too large. Maximum 10,000 keys per import chunk.",
  }),
});

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  cursor: z.string().optional(),
});

/**
 * Safely parse list/export query parameters from URL
 */
function parseQueryParams(url: URL): ReturnType<typeof QuerySchema.safeParse> {
  const limit = url.searchParams.get("limit") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  
  return QuerySchema.safeParse({ limit, cursor });
}

/**
 * Query used to list all user-created tables in SQLite backend
 */
const SQLITE_INTROSPECTION_QUERY = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name";

/**
 * Type guard for SQLite storage backend
 */
function hasSqlBackend(
  storage: unknown,
): storage is {
  sql: {
    exec: <T = unknown>(
      query: string,
    ) => { toArray: () => T[]; columnNames: string[] };
  };
} {
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

/**
 * Special storage key used to mark an instance as frozen (read-only)
 * When set to true, all put/delete operations are blocked
 */
const SYSTEM_KEY_PREFIX = "__do_manager_";
const FROZEN_STORAGE_KEY = `${SYSTEM_KEY_PREFIX}frozen`;
const FROZEN_AT_STORAGE_KEY = `${SYSTEM_KEY_PREFIX}frozen_at`;

/**
 * Cloudflare Durable Objects limit put() to 128 keys per operation
 */
const BATCH_SIZE = 128;

/**
 * Admin hook response types
 */
interface AdminListResponse {
  keys?: string[];
  tables?: string[];
  cursor?: string;
}

interface AdminGetResponse {
  value: unknown;
}

interface AdminExportResponse {
  data: Record<string, unknown>;
  exportedAt: string;
  keyCount: number;
  cursor?: string;
}

interface AdminAlarmResponse {
  alarm: number | null;
}

interface AdminSqlResponse {
  result: unknown[];
  rowCount: number;
  columns?: string[];
}

interface AdminFreezeResponse {
  frozen: boolean;
  frozenAt?: string;
}

/**
 * Interface representing an instance of AdminHooksDurableObject
 */
export interface AdminHooksInstance<Env = unknown> {
  state: DurableObjectState;
  env: Env;
  handleAdminRequest(request: Request): Promise<Response | null>;
  ensureNotFrozen(): Promise<void>;
  adminList(limit?: number, cursor?: string): Promise<AdminListResponse>;
  adminGet(key: string): Promise<AdminGetResponse>;
  adminPut(key: string, value: unknown): Promise<void>;
  adminDelete(key: string): Promise<void>;
  adminSql(query: string): AdminSqlResponse;
  adminGetAlarm(): Promise<AdminAlarmResponse>;
  adminSetAlarm(timestamp: number): Promise<void>;
  adminDeleteAlarm(): Promise<void>;
  adminExport(limit?: number, cursor?: string): Promise<AdminExportResponse>;
  adminImport(data: Record<string, unknown>): Promise<void>;
  adminFreeze(): Promise<AdminFreezeResponse>;
  adminUnfreeze(): Promise<AdminFreezeResponse>;
  adminGetFreezeStatus(): Promise<AdminFreezeResponse>;
  fetch(request: Request): Promise<Response>;
  alarm(): void;
}

/**
 * Constructor type for AdminHooksDurableObject class
 */
export type AdminHooksConstructor<Env = unknown> = new (
  state: DurableObjectState,
  env: Env,
) => AdminHooksInstance<Env>;

/**
 * Configuration options for admin hooks
 */
export interface AdminHooksOptions {
  /**
   * Base path for admin endpoints. Default: '/admin'
   */
  basePath?: string;

  /**
   * Whether to require authentication header. Default: false
   * If true, requests must include X-Admin-Key header matching the provided key
   */
  requireAuth?: boolean;

  /**
   * The admin key to validate against when requireAuth is true
   */
  adminKey?: string;

  /**
   * Custom handler for requests that don't match admin routes
   * If not provided, returns 404 for unmatched admin routes
   */
  fallback?: (request: Request) => Promise<Response> | Response;
}

/**
 * Utility to create a standardized JSON error response
 */
function createErrorResponse(message: string, status: number = HTTP_STATUS.BAD_REQUEST): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Safely parse JSON from a request body, returning null if invalid or empty
 */
async function safeParseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Helper to build options for KV/DO storage listing
 */
function buildListOptions(limit: number, cursor?: string): DurableObjectListOptions {
  const options: DurableObjectListOptions = { limit };
  if (cursor) {
    options.startAfter = cursor;
  }
  return options;
}

/**
 * Creates a Durable Object base class with admin hooks for DO Manager integration.
 *
 * @param options - Configuration options for admin hooks
 * @returns A class that can be extended by your Durable Object
 *
 * @example Basic usage:
 * ```typescript
 * import { withAdminHooks } from '@do-manager/admin-hooks';
 *
 * export class MyDurableObject extends withAdminHooks() {
 *   async fetch(request: Request): Promise<Response> {
 *     // Check admin routes first
 *     const adminResponse = await this.handleAdminRequest(request);
 *     if (adminResponse) return adminResponse;
 *
 *     // Your custom logic here
 *     return new Response('Hello from my DO!');
 *   }
 * }
 * ```
 *
 * @example With authentication:
 * ```typescript
 * export class SecureDO extends withAdminHooks({
 *   requireAuth: true,
 *   adminKey: 'my-secret-key'
 * }) {
 *   // ...
 * }
 * ```
 */
export function withAdminHooks<Env = unknown>(
  options: AdminHooksOptions = {},
): AdminHooksConstructor<Env> {
  const basePath = options.basePath ?? "/admin";

  class AdminHooksDurableObject {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
      this.state = state;
      this.env = env;
    }

    /**
     * Handle admin requests. Call this at the start of your fetch handler.
     * Returns a Response if the request was an admin request, or null if not.
     */
    async handleAdminRequest(request: Request): Promise<Response | null> {
      const url = new URL(request.url);
      const path = url.pathname;

      const isExactMatch = path === basePath;
      const hasTrailingSlash = basePath.endsWith('/');
      const isNestedMatch = path.startsWith(hasTrailingSlash ? basePath : `${basePath}/`);

      if (!isExactMatch && !isNestedMatch) {
        return null;
      }

      if (options.requireAuth) {
        const providedKey = request.headers.get("X-Admin-Key") ?? "";
        const expectedKey = options.adminKey ?? "";

        if (!expectedKey) {
          return createErrorResponse(
            "Server misconfiguration: adminKey is required when requireAuth is enabled",
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
          );
        }

        if (!(await timingSafeEqual(providedKey, expectedKey))) {
          return createErrorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
        }
      }

      const adminPath = path.slice(basePath.length);
      const operation = adminPath === "" ? "/" : (adminPath.startsWith("/") ? adminPath : `/${adminPath}`);

      try {
        return await match([operation, request.method])
          .with(["/list", "GET"], async () => {
            const parsed = parseQueryParams(url);
            if (!parsed.success) return createErrorResponse("Invalid limit or cursor");
            return Response.json(await this.adminList(parsed.data.limit, parsed.data.cursor));
          })
          .with(["/get", "GET"], async () => {
            const key = url.searchParams.get("key");
            if (!key) return createErrorResponse("Missing key parameter");
            return Response.json(await this.adminGet(key));
          })
          .with(["/put", "POST"], async () => {
            const rawBody = await safeParseJson(request);
            const parsed = PutPayloadSchema.safeParse(rawBody);
            if (!parsed.success) return createErrorResponse("Invalid or missing key/value in body");
            await this.adminPut(parsed.data.key, parsed.data.value);
            return Response.json({ success: true });
          })
          .with(["/freeze", "PUT"], async () => {
            return Response.json(await this.adminFreeze());
          })
          .with(["/freeze", "DELETE"], async () => {
            return Response.json(await this.adminUnfreeze());
          })
          .with(["/freeze", "GET"], async () => {
            return Response.json(await this.adminGetFreezeStatus());
          })
          .with(["/delete", "POST"], async () => {
            const rawBody = await safeParseJson(request);
            const parsed = DeletePayloadSchema.safeParse(rawBody);
            if (!parsed.success) return createErrorResponse("Invalid or missing key in body");
            await this.adminDelete(parsed.data.key);
            return Response.json({ success: true });
          })
          .with(["/sql", "POST"], async () => {
            await this.ensureNotFrozen();
            const rawBody = await safeParseJson(request);
            const parsed = SqlPayloadSchema.safeParse(rawBody);
            if (!parsed.success) return createErrorResponse("Invalid or missing query in body");
            return Response.json(this.adminSql(parsed.data.query));
          })
          .with(["/alarm", "GET"], async () => {
            return Response.json(await this.adminGetAlarm());
          })
          .with(["/alarm", "PUT"], async () => {
            const rawBody = await safeParseJson(request);
            const parsed = AlarmPayloadSchema.safeParse(rawBody);
            if (!parsed.success) return createErrorResponse("Invalid or missing timestamp in body");
            await this.adminSetAlarm(parsed.data.timestamp);
            return Response.json({ success: true, alarm: parsed.data.timestamp });
          })
          .with(["/alarm", "DELETE"], async () => {
            await this.adminDeleteAlarm();
            return Response.json({ success: true });
          })
          .with(["/export", "GET"], async () => {
            const parsed = parseQueryParams(url);
            if (!parsed.success) return createErrorResponse("Invalid limit or cursor");
            return Response.json(await this.adminExport(parsed.data.limit, parsed.data.cursor));
          })
          .with(["/import", "POST"], async () => {
            const rawBody = await safeParseJson(request);
            const parsed = ImportPayloadSchema.safeParse(rawBody);
            if (!parsed.success) return createErrorResponse("Invalid data object");
            await this.adminImport(parsed.data.data);
            return Response.json({ success: true, imported: Object.keys(parsed.data.data).length });
          })
          .otherwise(() => {
            return createErrorResponse("Unknown admin endpoint", HTTP_STATUS.NOT_FOUND);
          });
      } catch (error) {
        if (error instanceof AdminError) {
          return createErrorResponse(error.message, error.status);
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        return createErrorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }

    /**
     * Helper to check if the instance is frozen.
     * Throws an error if frozen.
     */
    async ensureNotFrozen(): Promise<void> {
      const isFrozen = await this.state.storage.get<boolean>(FROZEN_STORAGE_KEY);
      if (isFrozen) {
        throw new AdminError(
          "Instance is frozen. Unfreeze before making changes.",
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    /**
     * Validate key to prevent modification of internal system keys
     */
    validateKey(key: string): void {
      if (key.startsWith(SYSTEM_KEY_PREFIX)) {
        throw new AdminError(
          "Cannot manually modify internal system keys",
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    /**
     * List all storage keys or SQL tables
     */
    async adminList(limit = DEFAULT_LIST_LIMIT, cursor?: string): Promise<AdminListResponse> {
      // Check for SQLite backend
      if (hasSqlBackend(this.state.storage)) {
        const offset = cursor ? parseInt(cursor, 10) : 0;
        if (isNaN(offset)) {
          throw new Error("Invalid cursor format for SQLite backend");
        }
        
        const safeLimit = Math.min(Math.max(1, limit), MAX_LIST_LIMIT);
        
        const result = this.state.storage.sql.exec<{ name: string }>(
          `${SQLITE_INTROSPECTION_QUERY} LIMIT ${safeLimit} OFFSET ${offset}`
        );
        const tables = result.toArray().map((row) => row.name);
        const nextCursor = tables.length === safeLimit ? (offset + safeLimit).toString() : undefined;
        
        return { tables, cursor: nextCursor };
      }

      // KV backend
      const options = buildListOptions(limit, cursor);
      
      const entries = await this.state.storage.list(options);
      const allKeys = [...entries.keys()];
      const keys = allKeys.filter((k) => !k.startsWith(SYSTEM_KEY_PREFIX));
      const nextCursor = allKeys.length === limit ? allKeys[allKeys.length - 1] : undefined;
      
      return { keys, cursor: nextCursor };
    }

    /**
     * Get a single storage value
     */
    async adminGet(key: string): Promise<AdminGetResponse> {
      const value = await this.state.storage.get(key);
      return { value };
    }

    /**
     * Put a storage value (blocked if frozen or if attempting to modify system keys)
     */
    async adminPut(key: string, value: unknown): Promise<void> {
      this.validateKey(key);
      await this.ensureNotFrozen();
      await this.state.storage.put(key, value);
    }

    /**
     * Delete a storage value (blocked if frozen or if attempting to modify system keys)
     */
    async adminDelete(key: string): Promise<void> {
      this.validateKey(key);
      await this.ensureNotFrozen();
      await this.state.storage.delete(key);
    }

    /**
     * Execute SQL query (SQLite backend only)
     */
    adminSql(query: string): AdminSqlResponse {
      if (!hasSqlBackend(this.state.storage)) {
        throw new AdminError("SQL not available - this DO uses KV storage backend", HTTP_STATUS.BAD_REQUEST);
      }

      const result = this.state.storage.sql.exec(query);
      const rows = result.toArray();

      return {
        result: rows,
        rowCount: rows.length,
        columns: result.columnNames,
      };
    }

    /**
     * Get current alarm timestamp
     */
    async adminGetAlarm(): Promise<AdminAlarmResponse> {
      const alarm = await this.state.storage.getAlarm();
      return { alarm };
    }

    /**
     * Set alarm
     */
    async adminSetAlarm(timestamp: number): Promise<void> {
      await this.ensureNotFrozen();
      await this.state.storage.setAlarm(timestamp);
    }

    /**
     * Delete alarm
     */
    async adminDeleteAlarm(): Promise<void> {
      await this.ensureNotFrozen();
      await this.state.storage.deleteAlarm();
    }

    /**
     * Export all storage data
     */
    async adminExport(limit = DEFAULT_LIST_LIMIT, cursor?: string): Promise<AdminExportResponse> {
      const options = buildListOptions(limit, cursor);
      const entries = await this.state.storage.list(options);
      const data: Record<string, unknown> = {};

      let lastKey: string | undefined;
      for (const [key, value] of entries) {
        if (!key.startsWith(SYSTEM_KEY_PREFIX)) {
          data[key] = value;
        }
        lastKey = key;
      }

      const nextCursor = entries.size === limit ? lastKey : undefined;

      return {
        data,
        exportedAt: new Date().toISOString(),
        keyCount: Object.keys(data).length,
        cursor: nextCursor,
      };
    }

    /**
     * Import data (merge with existing) - blocked if frozen
     */
    async adminImport(data: Record<string, unknown>): Promise<void> {
      await this.ensureNotFrozen();
      
      for (const key of Object.keys(data)) {
        this.validateKey(key);
      }

      const entries = Object.entries(data);
      
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk = Object.fromEntries(entries.slice(i, i + BATCH_SIZE));
        await this.state.storage.put(chunk);
      }
    }

    /**
     * Freeze the instance (set read-only mode)
     */
    async adminFreeze(): Promise<AdminFreezeResponse> {
      const frozenAt = new Date().toISOString();
      await this.state.storage.put(FROZEN_STORAGE_KEY, true);
      await this.state.storage.put(FROZEN_AT_STORAGE_KEY, frozenAt);
      return { frozen: true, frozenAt };
    }

    /**
     * Unfreeze the instance (remove read-only mode)
     */
    async adminUnfreeze(): Promise<AdminFreezeResponse> {
      await this.state.storage.delete(FROZEN_STORAGE_KEY);
      await this.state.storage.delete(FROZEN_AT_STORAGE_KEY);
      return { frozen: false };
    }

    /**
     * Get freeze status
     */
    async adminGetFreezeStatus(): Promise<AdminFreezeResponse> {
      const isFrozen =
        await this.state.storage.get<boolean>(FROZEN_STORAGE_KEY);
      const frozenAt = await this.state.storage.get<string>(
        FROZEN_AT_STORAGE_KEY,
      );
      return { frozen: !!isFrozen, frozenAt: frozenAt ?? undefined };
    }

    /**
     * Default fetch handler - override this in your subclass
     */
    async fetch(request: Request): Promise<Response> {
      // Handle admin requests
      const adminResponse = await this.handleAdminRequest(request);
      if (adminResponse) return adminResponse;

      if (options.fallback) {
        return await options.fallback(request);
      }

      // Default response - override this in your subclass
      return new Response(
        "Durable Object with admin hooks enabled. Override fetch() to add your logic.",
        {
          headers: { "Content-Type": "text/plain" },
        },
      );
    }

    /**
     * Optional alarm handler - override this in your subclass if needed
     */
    alarm(): void {
      // Override in subclass to handle alarms
    }
  }

  return AdminHooksDurableObject;
}

/**
 * Type helper for extending the admin hooks class
 */
export type AdminHooksClass = ReturnType<typeof withAdminHooks>;

// Re-export types for consumers
export type {
  AdminListResponse,
  AdminGetResponse,
  AdminExportResponse,
  AdminAlarmResponse,
  AdminSqlResponse,
  AdminFreezeResponse,
};
