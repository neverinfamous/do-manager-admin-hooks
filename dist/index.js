"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  withAdminHooks: () => withAdminHooks
});
module.exports = __toCommonJS(index_exports);
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
function withAdminHooks(options = {}) {
  const basePath = options.basePath ?? "/admin";
  return class AdminHooksDurableObject {
    state;
    env;
    constructor(state, env) {
      this.state = state;
      this.env = env;
    }
    /**
     * Handle admin requests. Call this at the start of your fetch handler.
     * Returns a Response if the request was an admin request, or null if not.
     */
    async handleAdminRequest(request) {
      const url = new URL(request.url);
      const path = url.pathname;
      if (!path.startsWith(basePath)) {
        return null;
      }
      if (options.requireAuth) {
        const providedKey = request.headers.get("X-Admin-Key") ?? "";
        const expectedKey = options.adminKey ?? "";
        if (providedKey.length !== expectedKey.length || !timingSafeEqual(providedKey, expectedKey)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      const adminPath = path.slice(basePath.length);
      try {
        if (adminPath === "/list" && request.method === "GET") {
          return Response.json(await this.adminList());
        }
        if (adminPath === "/get" && request.method === "GET") {
          const key = url.searchParams.get("key");
          if (!key) {
            return new Response(JSON.stringify({ error: "Missing key parameter" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }
          return Response.json(await this.adminGet(key));
        }
        if (adminPath === "/put" && request.method === "POST") {
          const body = await request.json();
          if (!body.key) {
            return new Response(JSON.stringify({ error: "Missing key in body" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }
          await this.adminPut(body.key, body.value);
          return Response.json({ success: true });
        }
        if (adminPath === "/delete" && request.method === "POST") {
          const body = await request.json();
          if (!body.key) {
            return new Response(JSON.stringify({ error: "Missing key in body" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }
          await this.adminDelete(body.key);
          return Response.json({ success: true });
        }
        if (adminPath === "/sql" && request.method === "POST") {
          const body = await request.json();
          if (!body.query) {
            return new Response(JSON.stringify({ error: "Missing query in body" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }
          return Response.json(await this.adminSql(body.query));
        }
        if (adminPath === "/alarm" && request.method === "GET") {
          return Response.json(await this.adminGetAlarm());
        }
        if (adminPath === "/alarm" && request.method === "PUT") {
          const body = await request.json();
          if (typeof body.timestamp !== "number") {
            return new Response(JSON.stringify({ error: "Missing or invalid timestamp" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }
          await this.adminSetAlarm(body.timestamp);
          return Response.json({ success: true, alarm: body.timestamp });
        }
        if (adminPath === "/alarm" && request.method === "DELETE") {
          await this.adminDeleteAlarm();
          return Response.json({ success: true });
        }
        if (adminPath === "/export" && request.method === "GET") {
          return Response.json(await this.adminExport());
        }
        if (adminPath === "/import" && request.method === "POST") {
          const body = await request.json();
          if (!body.data || typeof body.data !== "object") {
            return new Response(JSON.stringify({ error: "Missing or invalid data object" }), {
              status: 400,
              headers: { "Content-Type": "application/json" }
            });
          }
          await this.adminImport(body.data);
          return Response.json({ success: true, imported: Object.keys(body.data).length });
        }
        return new Response(JSON.stringify({ error: "Unknown admin endpoint" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    /**
     * List all storage keys or SQL tables
     */
    async adminList() {
      if (this.state.storage.sql) {
        const result = this.state.storage.sql.exec(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
        );
        return { tables: result.toArray().map((row) => row.name) };
      }
      const entries = await this.state.storage.list();
      return { keys: [...entries.keys()] };
    }
    /**
     * Get a single storage value
     */
    async adminGet(key) {
      const value = await this.state.storage.get(key);
      return { value };
    }
    /**
     * Put a storage value
     */
    async adminPut(key, value) {
      await this.state.storage.put(key, value);
    }
    /**
     * Delete a storage value
     */
    async adminDelete(key) {
      await this.state.storage.delete(key);
    }
    /**
     * Execute SQL query (SQLite backend only)
     */
    async adminSql(query) {
      if (!this.state.storage.sql) {
        throw new Error("SQL not available - this DO uses KV storage backend");
      }
      const result = this.state.storage.sql.exec(query);
      const rows = result.toArray();
      return {
        result: rows,
        rowCount: rows.length,
        columns: result.columnNames
      };
    }
    /**
     * Get current alarm timestamp
     */
    async adminGetAlarm() {
      const alarm = await this.state.storage.getAlarm();
      return { alarm };
    }
    /**
     * Set alarm
     */
    async adminSetAlarm(timestamp) {
      await this.state.storage.setAlarm(timestamp);
    }
    /**
     * Delete alarm
     */
    async adminDeleteAlarm() {
      await this.state.storage.deleteAlarm();
    }
    /**
     * Export all storage data
     */
    async adminExport() {
      const entries = await this.state.storage.list();
      const data = {};
      for (const [key, value] of entries) {
        data[key] = value;
      }
      return {
        data,
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        keyCount: entries.size
      };
    }
    /**
     * Import data (merge with existing)
     */
    async adminImport(data) {
      await this.state.storage.put(data);
    }
    /**
     * Default fetch handler - override this in your subclass
     */
    async fetch(request) {
      const adminResponse = await this.handleAdminRequest(request);
      if (adminResponse) return adminResponse;
      return new Response("Durable Object with admin hooks enabled. Override fetch() to add your logic.", {
        headers: { "Content-Type": "text/plain" }
      });
    }
    /**
     * Optional alarm handler - override this in your subclass if needed
     */
    async alarm() {
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  withAdminHooks
});
