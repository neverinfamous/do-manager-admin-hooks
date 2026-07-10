import type { DurableObjectState } from '@cloudflare/workers-types';

export interface SqlStorageBackend {
  exec: <T = unknown>(query: string) => { toArray: () => T[], columnNames: string[] };
}

export interface AdminListResponse {
  keys?: string[];
  tables?: string[];
  cursor?: string;
}

export interface AdminGetResponse {
  value: unknown;
}

export interface AdminExportResponse {
  data: Record<string, unknown>;
  exportedAt: string;
  keyCount: number;
  cursor?: string;
}

export interface AdminAlarmResponse {
  alarm: number | null;
}

export interface AdminSqlResponse {
  result: unknown[];
  rowCount: number;
  columns?: string[];
}

export interface AdminFreezeResponse {
  frozen: boolean;
  frozenAt?: string;
}

export interface AdminHooksInstance<Env = unknown> {
  state: DurableObjectState;
  env: Env;
  handleAdminRequest(request: Request): Promise<Response | null>;
  ensureNotFrozen(): Promise<void>;
  adminList(limit?: number, cursor?: string): Promise<AdminListResponse>;
  adminGet(key: string): Promise<AdminGetResponse>;
  adminPut(key: string, value: unknown): Promise<void>;
  adminDelete(key: string): Promise<void>;
  adminSql(query: string): Promise<AdminSqlResponse>;
  adminGetAlarm(): Promise<AdminAlarmResponse>;
  adminSetAlarm(timestamp: number): Promise<void>;
  adminDeleteAlarm(): Promise<void>;
  adminExport(limit?: number, cursor?: string): Promise<AdminExportResponse>;
  adminImport(data: Record<string, unknown>): Promise<void>;
  adminFreeze(): Promise<AdminFreezeResponse>;
  adminUnfreeze(): Promise<AdminFreezeResponse>;
  adminGetFreezeStatus(): Promise<AdminFreezeResponse>;
  fetch(request: Request): Promise<Response>;
  alarm(): Promise<void> | void;
}

export type AdminHooksConstructor<Env = unknown> = new (
  state: DurableObjectState,
  env: Env,
) => AdminHooksInstance<Env>;

export interface AdminHooksOptions {
  basePath?: string;
  requireAuth?: boolean;
  adminKey?: string;
  fallback?: (request: Request) => Promise<Response> | Response;
}
