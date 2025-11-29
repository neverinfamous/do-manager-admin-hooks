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
  exec<T = Record<string, unknown>>(query: string, ...params: unknown[]): SqlStorageResult<T>;
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
  put<T>(key: string, value: T): Promise<void>;
  put<T>(entries: Record<string, T>): Promise<void>;
  delete(key: string): Promise<boolean>;
  delete(keys: string[]): Promise<number>;
  deleteAll(): Promise<void>;
  list<T = unknown>(options?: DurableObjectStorageListOptions): Promise<Map<string, T>>;
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
 * Admin hook request body types
 */
interface AdminPutBody {
  key: string;
  value: unknown;
}

interface AdminDeleteBody {
  key: string;
}

interface AdminSqlBody {
  query: string;
}

interface AdminAlarmBody {
  timestamp: number;
}

interface AdminImportBody {
  data: Record<string, unknown>;
}

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
export function withAdminHooks(options: AdminHooksOptions = {}) {
  const basePath = options.basePath ?? '/admin';
  
  return class AdminHooksDurableObject {
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
      
      // Check if this is an admin request
      if (!path.startsWith(basePath)) {
        return null;
      }
      
      // Check authentication if required
      if (options.requireAuth) {
        const providedKey = request.headers.get('X-Admin-Key');
        if (providedKey !== options.adminKey) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
      
      // Route admin requests
      const adminPath = path.slice(basePath.length);
      
      try {
        // List keys/tables
        if (adminPath === '/list' && request.method === 'GET') {
          return Response.json(await this.adminList());
        }
        
        // Get single value
        if (adminPath === '/get' && request.method === 'GET') {
          const key = url.searchParams.get('key');
          if (!key) {
            return new Response(JSON.stringify({ error: 'Missing key parameter' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return Response.json(await this.adminGet(key));
        }
        
        // Put value
        if (adminPath === '/put' && request.method === 'POST') {
          const body = await request.json() as AdminPutBody;
          if (!body.key) {
            return new Response(JSON.stringify({ error: 'Missing key in body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          await this.adminPut(body.key, body.value);
          return Response.json({ success: true });
        }
        
        // Delete value
        if (adminPath === '/delete' && request.method === 'POST') {
          const body = await request.json() as AdminDeleteBody;
          if (!body.key) {
            return new Response(JSON.stringify({ error: 'Missing key in body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          await this.adminDelete(body.key);
          return Response.json({ success: true });
        }
        
        // Execute SQL (SQLite backend only)
        if (adminPath === '/sql' && request.method === 'POST') {
          const body = await request.json() as AdminSqlBody;
          if (!body.query) {
            return new Response(JSON.stringify({ error: 'Missing query in body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return Response.json(await this.adminSql(body.query));
        }
        
        // Get alarm
        if (adminPath === '/alarm' && request.method === 'GET') {
          return Response.json(await this.adminGetAlarm());
        }
        
        // Set alarm
        if (adminPath === '/alarm' && request.method === 'PUT') {
          const body = await request.json() as AdminAlarmBody;
          if (typeof body.timestamp !== 'number') {
            return new Response(JSON.stringify({ error: 'Missing or invalid timestamp' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          await this.adminSetAlarm(body.timestamp);
          return Response.json({ success: true, alarm: body.timestamp });
        }
        
        // Delete alarm
        if (adminPath === '/alarm' && request.method === 'DELETE') {
          await this.adminDeleteAlarm();
          return Response.json({ success: true });
        }
        
        // Export all data
        if (adminPath === '/export' && request.method === 'GET') {
          return Response.json(await this.adminExport());
        }
        
        // Import data
        if (adminPath === '/import' && request.method === 'POST') {
          const body = await request.json() as AdminImportBody;
          if (!body.data || typeof body.data !== 'object') {
            return new Response(JSON.stringify({ error: 'Missing or invalid data object' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          await this.adminImport(body.data);
          return Response.json({ success: true, imported: Object.keys(body.data).length });
        }
        
        // Unknown admin route
        return new Response(JSON.stringify({ error: 'Unknown admin endpoint' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
        
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    /**
     * List all storage keys or SQL tables
     */
    async adminList(): Promise<AdminListResponse> {
      // Check for SQLite backend
      if (this.state.storage.sql) {
        const result = this.state.storage.sql.exec<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
        );
        return { tables: result.toArray().map(row => row.name) };
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
     * Put a storage value
     */
    async adminPut(key: string, value: unknown): Promise<void> {
      await this.state.storage.put(key, value);
    }
    
    /**
     * Delete a storage value
     */
    async adminDelete(key: string): Promise<void> {
      await this.state.storage.delete(key);
    }
    
    /**
     * Execute SQL query (SQLite backend only)
     */
    async adminSql(query: string): Promise<AdminSqlResponse> {
      if (!this.state.storage.sql) {
        throw new Error('SQL not available - this DO uses KV storage backend');
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
     * Import data (merge with existing)
     */
    async adminImport(data: Record<string, unknown>): Promise<void> {
      await this.state.storage.put(data);
    }
    
    /**
     * Default fetch handler - override this in your subclass
     */
    async fetch(request: Request): Promise<Response> {
      // Handle admin requests
      const adminResponse = await this.handleAdminRequest(request);
      if (adminResponse) return adminResponse;
      
      // Default response - override this in your subclass
      return new Response('Durable Object with admin hooks enabled. Override fetch() to add your logic.', {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    /**
     * Optional alarm handler - override this in your subclass if needed
     */
    async alarm(): Promise<void> {
      // Override in subclass to handle alarms
    }
  };
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
};

