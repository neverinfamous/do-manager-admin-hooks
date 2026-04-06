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
    put(key: string, value: unknown): Promise<void>;
    put(entries: Record<string, unknown>): Promise<void>;
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
interface AdminHooksInstance {
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
type AdminHooksConstructor = new (state: DurableObjectState, env: unknown) => AdminHooksInstance;
/**
 * Configuration options for admin hooks
 */
interface AdminHooksOptions {
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
declare function withAdminHooks(options?: AdminHooksOptions): AdminHooksConstructor;
/**
 * Type helper for extending the admin hooks class
 */
type AdminHooksClass = ReturnType<typeof withAdminHooks>;

export { type AdminAlarmResponse, type AdminExportResponse, type AdminFreezeResponse, type AdminGetResponse, type AdminHooksClass, type AdminHooksConstructor, type AdminHooksInstance, type AdminHooksOptions, type AdminListResponse, type AdminSqlResponse, withAdminHooks };
