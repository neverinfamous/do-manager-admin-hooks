/* eslint-disable @typescript-eslint/no-inferrable-types */
export const ALGO_SHA256 = 'SHA-256' as const;
export const ADMIN_KEY_HEADER = "X-Admin-Key";
export const INTERNAL_SYSTEM_TABLE = "_do_manager_system";
export const FROZEN_TRUE_VALUE = "true";

export const HTTP_METHOD = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE"
} as const;

export const ROUTES = {
  LIST: "/list",
  GET: "/get",
  PUT: "/put",
  DELETE: "/delete",
  SQL: "/sql",
  ALARM: "/alarm",
  EXPORT: "/export",
  IMPORT: "/import",
  FREEZE: "/freeze",
} as const;

export const DEFAULT_BASE_PATH = "/admin";

export const CONTENT_TYPES = {
  JSON: "application/json",
  TEXT: "text/plain",
} as const;

export const SUCCESS_RESPONSE = { success: true } as const;

export const FALLBACK_RESPONSE_TEXT = "Durable Object with admin hooks enabled. Override fetch() to add your logic.";

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  MISSING_ADMIN_KEY: "Server misconfiguration: adminKey is required when requireAuth is enabled",
  INVALID_LIMIT_CURSOR: "Invalid limit or cursor",
  MISSING_KEY: "Missing or invalid key parameter",
  INVALID_PUT_BODY: "Invalid or missing key/value in body",
  INVALID_DELETE_BODY: "Invalid or missing key in body",
  INVALID_SQL_BODY: "Invalid or missing query in body",
  INVALID_ALARM_BODY: "Invalid or missing timestamp in body",
  INVALID_IMPORT_BODY: "Invalid data object",
  UNKNOWN_ENDPOINT: "Unknown admin endpoint",
  UNKNOWN_ERROR: "Unknown error",
  FROZEN_INSTANCE: "Instance is frozen. Unfreeze before making changes.",
  SYSTEM_KEY_MODIFICATION: "Cannot manually modify internal system keys",
  SQL_NOT_AVAILABLE: "SQL not available - this DO uses KV storage backend",
  SQL_FAILED: "SQL execution failed",
  SQLITE_CURSOR: "Invalid cursor format for SQLite backend",
  SQLITE_NO_SUCH_TABLE: "no such table",
  PAYLOAD_TOO_LARGE: "Payload too large. Maximum keys exceeded.",
  KV_NOT_AVAILABLE: "KV operations not available - this DO uses SQL storage backend"
} as const;

export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const DEFAULT_LIST_LIMIT = 1000;
export const MAX_LIST_LIMIT = 5000;
export const MAX_IMPORT_KEYS = 10000;
export const BATCH_SIZE = 128;
export const MAX_KEY_BYTES = 2048;
export const MAX_SQL_QUERY_LENGTH = 100000;
export const MAX_CURSOR_LENGTH = 4096;

export const SYSTEM_KEY_PREFIX: string = "__do_manager_";
export const FROZEN_STORAGE_KEY: string = `${SYSTEM_KEY_PREFIX}frozen`;
export const FROZEN_AT_STORAGE_KEY: string = `${SYSTEM_KEY_PREFIX}frozen_at`;

export const SQLITE_INTROSPECTION_QUERY: string = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != '${INTERNAL_SYSTEM_TABLE}' ORDER BY name`;
