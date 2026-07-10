import { z } from 'zod';
import { match } from 'ts-pattern';
import type { DurableObjectState } from '@cloudflare/workers-types';
import { 
  ADMIN_KEY_HEADER, 
  HTTP_METHOD, 
  ERROR_MESSAGES, 
  HTTP_STATUS, 
  INTERNAL_SYSTEM_TABLE, 
  FROZEN_STORAGE_KEY, 
  FROZEN_AT_STORAGE_KEY, 
  FROZEN_TRUE_VALUE, 
  DEFAULT_LIST_LIMIT, 
  BATCH_SIZE, 
  SQLITE_INTROSPECTION_QUERY,
  ROUTES,
  DEFAULT_BASE_PATH,
  CONTENT_TYPES,
  SUCCESS_RESPONSE,
  FALLBACK_RESPONSE_TEXT
} from './constants';
import type { 
  AdminHooksConstructor, 
  AdminHooksOptions, 
  SqlStorageBackend,
  AdminListResponse,
  AdminGetResponse,
  AdminExportResponse,
  AdminAlarmResponse,
  AdminSqlResponse,
  AdminFreezeResponse
} from './types';
import { AdminError, createErrorResponse } from './errors';
import { 
  timingSafeEqual, 
  parseBody, 
  parseQuery, 
  hasSqlBackend, 
  isSystemKey, 
  buildListOptions 
} from './utils';
import { 
  QuerySchema,
  GetQuerySchema, 
  PutPayloadSchema, 
  DeletePayloadSchema, 
  SqlPayloadSchema, 
  AlarmPayloadSchema, 
  ImportPayloadSchema, 
  SqlFreezeRowSchema, 
  SqlTableSchema 
} from './schemas';

export function withAdminHooks<Env = unknown>(
  options: AdminHooksOptions = {},
): AdminHooksConstructor<Env> {
  const basePath = options.basePath ?? DEFAULT_BASE_PATH;

  class AdminHooksDurableObject {
    state: DurableObjectState;
    env: Env;

    constructor(state: DurableObjectState, env: Env) {
      this.state = state;
      this.env = env;
    }

    /**
     * Helper to safely access the SQL backend if available
     */
    private getSql(): SqlStorageBackend | undefined {
      return hasSqlBackend(this.state.storage) ? this.state.storage.sql : undefined;
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

      const requireAuth = options.requireAuth ?? (options.adminKey !== undefined);

      if (requireAuth) {
        const providedKey = request.headers.get(ADMIN_KEY_HEADER);
        const expectedKey = options.adminKey;

        if (!expectedKey) {
          return createErrorResponse(
            ERROR_MESSAGES.MISSING_ADMIN_KEY,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
          );
        }

        if (!providedKey || !(await timingSafeEqual(providedKey, expectedKey))) {
          return createErrorResponse(ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
        }
      }

      const pathParts = path.split('/');
      const operation = `/${pathParts[pathParts.length - 1]}`;

      try {
        return await match([operation, request.method])
          .with([ROUTES.LIST, HTTP_METHOD.GET], async () => {
            const query = parseQuery(url, QuerySchema, ERROR_MESSAGES.INVALID_LIMIT_CURSOR);
            return Response.json(await this.adminList(query.limit, query.cursor));
          })
          .with([ROUTES.GET, HTTP_METHOD.GET], async () => {
            const query = parseQuery(url, GetQuerySchema, ERROR_MESSAGES.MISSING_KEY);
            return Response.json(await this.adminGet(query.key));
          })
          .with([ROUTES.PUT, HTTP_METHOD.POST], async () => {
            const body = await parseBody(request, PutPayloadSchema, ERROR_MESSAGES.INVALID_PUT_BODY);
            await this.adminPut(body.key, body.value);
            return Response.json(SUCCESS_RESPONSE);
          })
          .with([ROUTES.FREEZE, HTTP_METHOD.PUT], async () => {
            return Response.json(await this.adminFreeze());
          })
          .with([ROUTES.FREEZE, HTTP_METHOD.DELETE], async () => {
            return Response.json(await this.adminUnfreeze());
          })
          .with([ROUTES.FREEZE, HTTP_METHOD.GET], async () => {
            return Response.json(await this.adminGetFreezeStatus());
          })
          .with([ROUTES.DELETE, HTTP_METHOD.POST], async () => {
            const body = await parseBody(request, DeletePayloadSchema, ERROR_MESSAGES.INVALID_DELETE_BODY);
            await this.adminDelete(body.key);
            return Response.json(SUCCESS_RESPONSE);
          })
          .with([ROUTES.SQL, HTTP_METHOD.POST], async () => {
            const body = await parseBody(request, SqlPayloadSchema, ERROR_MESSAGES.INVALID_SQL_BODY);
            return Response.json(await this.adminSql(body.query));
          })
          .with([ROUTES.ALARM, HTTP_METHOD.GET], async () => {
            return Response.json(await this.adminGetAlarm());
          })
          .with([ROUTES.ALARM, HTTP_METHOD.PUT], async () => {
            const body = await parseBody(request, AlarmPayloadSchema, ERROR_MESSAGES.INVALID_ALARM_BODY);
            await this.adminSetAlarm(body.timestamp);
            return Response.json({ ...SUCCESS_RESPONSE, alarm: body.timestamp });
          })
          .with([ROUTES.ALARM, HTTP_METHOD.DELETE], async () => {
            await this.adminDeleteAlarm();
            return Response.json(SUCCESS_RESPONSE);
          })
          .with([ROUTES.EXPORT, HTTP_METHOD.GET], async () => {
            const query = parseQuery(url, QuerySchema, ERROR_MESSAGES.INVALID_LIMIT_CURSOR);
            return Response.json(await this.adminExport(query.limit, query.cursor));
          })
          .with([ROUTES.IMPORT, HTTP_METHOD.POST], async () => {
            const body = await parseBody(request, ImportPayloadSchema, ERROR_MESSAGES.INVALID_IMPORT_BODY);
            await this.adminImport(body.data);
            return Response.json({ ...SUCCESS_RESPONSE, imported: Object.keys(body.data).length });
          })
          .otherwise(() => {
            return createErrorResponse(ERROR_MESSAGES.UNKNOWN_ENDPOINT, HTTP_STATUS.NOT_FOUND);
          });
      } catch (error) {
        if (error instanceof AdminError) {
          return createErrorResponse(error.message, error.status);
        }
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.UNKNOWN_ERROR;
        return createErrorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    }

    /**
     * Internal helper to get freeze state across both KV and SQL backends.
     */
    async getFreezeState(): Promise<{ isFrozen: boolean; frozenAt?: string }> {
      const sql = this.getSql();
      if (sql) {
        try {
          const result = sql.exec(
            `SELECT key, value FROM ${INTERNAL_SYSTEM_TABLE} WHERE key IN ('${FROZEN_STORAGE_KEY}', '${FROZEN_AT_STORAGE_KEY}')`
          );
          const rows = z.array(SqlFreezeRowSchema).parse(result.toArray());
          const isFrozenRow = rows.find(r => r.key === FROZEN_STORAGE_KEY);
          if (isFrozenRow?.value === FROZEN_TRUE_VALUE) {
            const timeRow = rows.find(r => r.key === FROZEN_AT_STORAGE_KEY);
            return { isFrozen: true, frozenAt: timeRow?.value };
          }
        } catch (error) {
          if (error instanceof Error && !error.message.includes(ERROR_MESSAGES.SQLITE_NO_SUCH_TABLE)) {
            throw new AdminError(ERROR_MESSAGES.SQL_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
          }
        }
      }

      const isFrozenRaw = await this.state.storage.get(FROZEN_STORAGE_KEY);
      const frozenAtRaw = await this.state.storage.get(FROZEN_AT_STORAGE_KEY);
      
      let isFrozen = false;
      if (isFrozenRaw !== undefined) {
        const parsed = z.union([z.boolean(), z.string()]).safeParse(isFrozenRaw);
        if (parsed.success) {
          isFrozen = parsed.data === true || parsed.data === FROZEN_TRUE_VALUE;
        }
      }
      
      const frozenAt = typeof frozenAtRaw === 'string' ? frozenAtRaw : undefined;
      
      return { isFrozen, frozenAt };
    }

    /**
     * Internal helper to set freeze state across both KV and SQL backends.
     */
    async setFreezeState(frozen: boolean): Promise<string | undefined> {
      const sql = this.getSql();
      const frozenAt = frozen ? new Date().toISOString() : undefined;

      if (sql) {
        sql.exec(
          `CREATE TABLE IF NOT EXISTS ${INTERNAL_SYSTEM_TABLE} (key TEXT PRIMARY KEY, value TEXT)`
        );
        if (frozenAt) {
          sql.exec(
            `INSERT OR REPLACE INTO ${INTERNAL_SYSTEM_TABLE} (key, value) VALUES ('${FROZEN_STORAGE_KEY}', '${FROZEN_TRUE_VALUE}'), ('${FROZEN_AT_STORAGE_KEY}', '${frozenAt}')`
          );
        } else {
          sql.exec(
            `DELETE FROM ${INTERNAL_SYSTEM_TABLE} WHERE key IN ('${FROZEN_STORAGE_KEY}', '${FROZEN_AT_STORAGE_KEY}')`
          );
        }
      } else {
        if (frozenAt) {
          await this.state.storage.put(FROZEN_STORAGE_KEY, FROZEN_TRUE_VALUE);
          await this.state.storage.put(FROZEN_AT_STORAGE_KEY, frozenAt);
        } else {
          await this.state.storage.delete(FROZEN_STORAGE_KEY);
          await this.state.storage.delete(FROZEN_AT_STORAGE_KEY);
        }
      }
      
      return frozenAt;
    }

    /**
     * Helper to enforce KV backend is available
     */
    ensureKvBackend(): void {
      if (this.getSql()) {
        throw new AdminError(ERROR_MESSAGES.KV_NOT_AVAILABLE, HTTP_STATUS.BAD_REQUEST);
      }
    }

    /**
     * Helper to check if the instance is frozen.
     * Throws an error if frozen.
     */
    async ensureNotFrozen(): Promise<void> {
      const { isFrozen } = await this.getFreezeState();
      if (isFrozen) {
        throw new AdminError(
          ERROR_MESSAGES.FROZEN_INSTANCE,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    /**
     * Validate key to prevent modification of internal system keys
     */
    validateKey(key: string): void {
      if (isSystemKey(key)) {
        throw new AdminError(
          ERROR_MESSAGES.SYSTEM_KEY_MODIFICATION,
          HTTP_STATUS.BAD_REQUEST
        );
      }
    }

    /**
     * Validate key and ensure mutation is allowed (KV backend, not frozen, valid key)
     */
    private async validateKvMutation(key?: string): Promise<void> {
      this.ensureKvBackend();
      if (key !== undefined) {
        this.validateKey(key);
      }
      await this.ensureNotFrozen();
    }

    /**
     * List all storage keys or SQL tables
     */
    async adminList(limit = DEFAULT_LIST_LIMIT, cursor?: string): Promise<AdminListResponse> {
      // Check for SQLite backend
      const sql = this.getSql();
      if (sql) {
        const offset = cursor ? Number(cursor) : 0;
        if (!Number.isSafeInteger(offset) || offset < 0) {
          throw new AdminError(ERROR_MESSAGES.SQLITE_CURSOR, HTTP_STATUS.BAD_REQUEST);
        }
        
        const result = sql.exec(
          `${SQLITE_INTROSPECTION_QUERY} LIMIT ${limit} OFFSET ${offset}`
        );
        const tables = z.array(SqlTableSchema).parse(result.toArray()).map((row) => row.name);
        const nextCursor = tables.length === limit ? (offset + limit).toString() : undefined;
        
        return { tables, cursor: nextCursor };
      }

      // KV backend
      const options = buildListOptions(limit, cursor);
      
      const entries = await this.state.storage.list(options);
      const allKeys = [...entries.keys()];
      const keys = allKeys.filter((k) => !isSystemKey(k));
      const nextCursor = allKeys.length === limit ? allKeys[allKeys.length - 1] : undefined;
      
      return { keys, cursor: nextCursor };
    }

    /**
     * Get a single storage value
     */
    async adminGet(key: string): Promise<AdminGetResponse> {
      this.ensureKvBackend();
      this.validateKey(key);
      const value = await this.state.storage.get(key);
      return { value };
    }

    /**
     * Put a storage value (blocked if frozen or if attempting to modify system keys)
     */
    async adminPut(key: string, value: unknown): Promise<void> {
      await this.validateKvMutation(key);
      await this.state.storage.put(key, value);
    }

    /**
     * Delete a storage value (blocked if frozen or if attempting to modify system keys)
     */
    async adminDelete(key: string): Promise<void> {
      await this.validateKvMutation(key);
      await this.state.storage.delete(key);
    }

    /**
     * Execute SQL query (SQLite backend only)
     */
    async adminSql(query: string): Promise<AdminSqlResponse> {
      await this.ensureNotFrozen();

      const sql = this.getSql();
      if (!sql) {
        throw new AdminError(ERROR_MESSAGES.SQL_NOT_AVAILABLE, HTTP_STATUS.BAD_REQUEST);
      }

      if (query.toLowerCase().includes(INTERNAL_SYSTEM_TABLE.toLowerCase())) {
        throw new AdminError(ERROR_MESSAGES.SYSTEM_KEY_MODIFICATION, HTTP_STATUS.BAD_REQUEST);
      }

      try {
        const result = sql.exec(query);
        const rows = result.toArray();

        return {
          result: rows,
          rowCount: rows.length,
          columns: result.columnNames,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : ERROR_MESSAGES.SQL_FAILED;
        throw new AdminError(message, HTTP_STATUS.BAD_REQUEST);
      }
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
      this.ensureKvBackend();
      const options = buildListOptions(limit, cursor);
      const entries = await this.state.storage.list(options);
      const data: Record<string, unknown> = {};

      let lastKey: string | undefined;
      for (const [key, value] of entries) {
        if (!isSystemKey(key)) {
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
      await this.validateKvMutation();

      for (const key of Object.keys(data)) {
        this.validateKey(key);
      }

      const entries = Object.entries(data);
      
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk: Record<string, unknown> = Object.fromEntries(entries.slice(i, i + BATCH_SIZE));
        await this.state.storage.put(chunk);
      }
    }

    /**
     * Freeze the instance (set read-only mode)
     */
    async adminFreeze(): Promise<AdminFreezeResponse> {
      const frozenAt = await this.setFreezeState(true);
      return { frozen: true, frozenAt };
    }

    /**
     * Unfreeze the instance (remove read-only mode)
     */
    async adminUnfreeze(): Promise<AdminFreezeResponse> {
      await this.setFreezeState(false);
      return { frozen: false };
    }

    /**
     * Get freeze status
     */
    async adminGetFreezeStatus(): Promise<AdminFreezeResponse> {
      const { isFrozen, frozenAt } = await this.getFreezeState();
      return { frozen: isFrozen, frozenAt };
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
        FALLBACK_RESPONSE_TEXT,
        {
          headers: { "Content-Type": CONTENT_TYPES.TEXT },
        },
      );
    }

    /**
     * Optional alarm handler - override this in your subclass if needed
     */
    alarm(): Promise<void> | void {
      // Override in subclass to handle alarms
    }
  }

  return AdminHooksDurableObject;
}

export type AdminHooksClass = ReturnType<typeof withAdminHooks>;
