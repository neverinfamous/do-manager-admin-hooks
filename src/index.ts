import { z } from 'zod';
import { match } from 'ts-pattern';

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

// Type definitions for Durable Object context
interface DurableObjectState {
  storage: DurableObjectStorage;
  id: DurableObjectId;
  waitUntil(promise: Promise<unknown>): void;
}

interface SqlStorage {
  exec<T = Record<string, unknown>>(
    query: string,
    ...params: unknown[]
  ): SqlStorageResult<T>;
}

interface SqlStorageResult<T> {
  toArray(): T[];
  one(): T | null;
  raw(): unknown[][];
  columnNames: string[];
  rowsRead: number;
  rowsWritten: number;
}

interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  get<T = unknown>(keys: string[]): Promise<Map<string, T>>;
  put(key: string, value: unknown): Promise<void>;
  put(entries: Record<string, unknown>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  deleteAll(): Promise<void>;
  list<T = unknown>(
    options?: DurableObjectStorageListOptions,
  ): Promise<Map<string, T>>;
  getAlarm(): Promise<number | null>;
  setAlarm(scheduledTime: number | Date): Promise<void>;
  deleteAlarm(): Promise<void>;
  sql?: SqlStorage;
}

interface DurableObjectStorageListOptions {
  start?: string;
  startAfter?: string;
  end?: string;
  prefix?: string;
  reverse?: boolean;
  limit?: number;
}

interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
  name?: string;
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}



/**
 * Special storage key used to mark an instance as frozen (read-only)
 * When set to true, all put/delete operations are blocked
 */

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

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
  timestamp: z.number(),
});

const ImportPayloadSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

const FROZEN_STORAGE_KEY = "__do_manager_frozen";

/**
 * Admin hook response types
 */
interface AdminListResponse {
  keys?: string[];
  tables?: string[];
}

interface AdminGetResponse {
  value: unknown;
}

interface AdminExportResponse {
  data: Record<string, unknown>;
  exportedAt: string;
  keyCount: number;
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
export interface AdminHooksInstance {
  state: DurableObjectState;
  env: unknown;
  handleAdminRequest(request: Request): Promise<Response | null>;
  adminList(): Promise<AdminListResponse>;
  adminGet(key: string): Promise<AdminGetResponse>;
  adminPut(key: string, value: unknown): Promise<void>;
  adminDelete(key: string): Promise<void>;
  adminSql(query: string): AdminSqlResponse;
  adminGetAlarm(): Promise<AdminAlarmResponse>;
  adminSetAlarm(timestamp: number): Promise<void>;
  adminDeleteAlarm(): Promise<void>;
  adminExport(): Promise<AdminExportResponse>;
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
export type AdminHooksConstructor = new (
  state: DurableObjectState,
  env: unknown,
) => AdminHooksInstance;

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
export function withAdminHooks(
  options: AdminHooksOptions = {},
): AdminHooksConstructor {
  const basePath = options.basePath ?? "/admin";

  class AdminHooksDurableObject {
    state: DurableObjectState;
    env: unknown;

    constructor(state: DurableObjectState, env: unknown) {
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

      if (!path.startsWith(basePath)) {
        return null;
      }

      if (options.requireAuth) {
        const providedKey = request.headers.get("X-Admin-Key") ?? "";
        const expectedKey = options.adminKey ?? "";

        if (
          providedKey.length !== expectedKey.length ||
          !timingSafeEqual(providedKey, expectedKey)
        ) {
          return createErrorResponse("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
        }
      }

      const adminPath = path.slice(basePath.length);
      const pathParts = adminPath.split("/").filter(Boolean);
      const operation = pathParts.length > 0 ? "/" + pathParts[pathParts.length - 1] : "";

      try {
        return await match([operation, request.method])
          .with(["/list", "GET"], async () => {
            return Response.json(await this.adminList());
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
            return Response.json(await this.adminExport());
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
        const message = error instanceof Error ? error.message : "Unknown error";
        return createErrorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }

    /**
     * List all storage keys or SQL tables
     */
    async adminList(): Promise<AdminListResponse> {
      // Check for SQLite backend
      if (this.state.storage.sql) {
        const result = this.state.storage.sql.exec<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
        );
        return { tables: result.toArray().map((row) => row.name) };
      }

      // KV backend
      const entries = await this.state.storage.list();
      return { keys: [...entries.keys()] };
    }

    /**
     * Get a single storage value
     */
    async adminGet(key: string): Promise<AdminGetResponse> {
      const value = await this.state.storage.get(key);
      return { value };
    }

    /**
     * Put a storage value (blocked if frozen, unless it's the frozen key itself)
     */
    async adminPut(key: string, value: unknown): Promise<void> {
      // Allow setting/unsetting the frozen key itself
      if (key !== FROZEN_STORAGE_KEY) {
        const isFrozen =
          await this.state.storage.get<boolean>(FROZEN_STORAGE_KEY);
        if (isFrozen) {
          throw new Error(
            "Instance is frozen. Unfreeze before making changes.",
          );
        }
      }
      await this.state.storage.put(key, value);
    }

    /**
     * Delete a storage value (blocked if frozen, unless it's the frozen key itself)
     */
    async adminDelete(key: string): Promise<void> {
      // Allow deleting the frozen key itself (for unfreezing)
      if (key !== FROZEN_STORAGE_KEY) {
        const isFrozen =
          await this.state.storage.get<boolean>(FROZEN_STORAGE_KEY);
        if (isFrozen) {
          throw new Error(
            "Instance is frozen. Unfreeze before making changes.",
          );
        }
      }
      await this.state.storage.delete(key);
    }

    /**
     * Execute SQL query (SQLite backend only)
     */
    adminSql(query: string): AdminSqlResponse {
      if (!this.state.storage.sql) {
        throw new Error("SQL not available - this DO uses KV storage backend");
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
      await this.state.storage.setAlarm(timestamp);
    }

    /**
     * Delete alarm
     */
    async adminDeleteAlarm(): Promise<void> {
      await this.state.storage.deleteAlarm();
    }

    /**
     * Export all storage data
     */
    async adminExport(): Promise<AdminExportResponse> {
      const entries = await this.state.storage.list();
      const data: Record<string, unknown> = {};

      for (const [key, value] of entries) {
        data[key] = value;
      }

      return {
        data,
        exportedAt: new Date().toISOString(),
        keyCount: entries.size,
      };
    }

    /**
     * Import data (merge with existing) - blocked if frozen
     */
    async adminImport(data: Record<string, unknown>): Promise<void> {
      const isFrozen =
        await this.state.storage.get<boolean>(FROZEN_STORAGE_KEY);
      if (isFrozen) {
        throw new Error("Instance is frozen. Unfreeze before importing data.");
      }
      await this.state.storage.put(data);
    }

    /**
     * Freeze the instance (set read-only mode)
     */
    async adminFreeze(): Promise<AdminFreezeResponse> {
      const frozenAt = new Date().toISOString();
      await this.state.storage.put(FROZEN_STORAGE_KEY, true);
      await this.state.storage.put(`${FROZEN_STORAGE_KEY}_at`, frozenAt);
      return { frozen: true, frozenAt };
    }

    /**
     * Unfreeze the instance (remove read-only mode)
     */
    async adminUnfreeze(): Promise<AdminFreezeResponse> {
      await this.state.storage.delete(FROZEN_STORAGE_KEY);
      await this.state.storage.delete(`${FROZEN_STORAGE_KEY}_at`);
      return { frozen: false };
    }

    /**
     * Get freeze status
     */
    async adminGetFreezeStatus(): Promise<AdminFreezeResponse> {
      const isFrozen =
        await this.state.storage.get<boolean>(FROZEN_STORAGE_KEY);
      const frozenAt = await this.state.storage.get<string>(
        `${FROZEN_STORAGE_KEY}_at`,
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
