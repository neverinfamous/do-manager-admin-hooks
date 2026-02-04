# do-manager-admin-hooks

**Last Updated: February 4, 2026**

[![npm](https://img.shields.io/npm/v/do-manager-admin-hooks)](https://www.npmjs.com/package/do-manager-admin-hooks)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Admin hooks for Cloudflare Durable Objects that enable integration with [DO Manager](https://do.adamic.tech).

## Installation

```bash
npm install do-manager-admin-hooks
```

## Quick Start

```typescript
import { withAdminHooks } from "do-manager-admin-hooks";

export class MyDurableObject extends withAdminHooks() {
  async fetch(request: Request): Promise<Response> {
    // Handle admin requests first (required for DO Manager)
    const adminResponse = await this.handleAdminRequest(request);
    if (adminResponse) return adminResponse;

    // Your custom logic here
    return new Response("Hello from my Durable Object!");
  }
}
```

## Configuration Options

```typescript
export class SecureDO extends withAdminHooks({
  // Change the base path for admin endpoints (default: '/admin')
  basePath: "/admin",

  // Require authentication for admin endpoints (recommended for production)
  requireAuth: true,
  adminKey: "your-secret-key",
}) {
  // ...
}
```

## Admin Endpoints

Once you extend `withAdminHooks()`, your Durable Object exposes these endpoints:

| Endpoint              | Method | Description                               |
| --------------------- | ------ | ----------------------------------------- |
| `/admin/list`         | GET    | List storage keys (KV) or tables (SQLite) |
| `/admin/get?key=X`    | GET    | Get value for a key                       |
| `/admin/put`          | POST   | Set key-value pair (`{ key, value }`)     |
| `/admin/delete`       | POST   | Delete a key (`{ key }`)                  |
| `/admin/sql`          | POST   | Execute SQL (`{ query }`) - SQLite only   |
| `/admin/alarm`        | GET    | Get current alarm                         |
| `/admin/alarm`        | PUT    | Set alarm (`{ timestamp }`)               |
| `/admin/alarm`        | DELETE | Delete alarm                              |
| `/admin/export`       | GET    | Export all storage as JSON                |
| `/admin/import`       | POST   | Import data (`{ data: {...} }`)           |
| `/admin/:name/freeze` | PUT    | Freeze instance (block writes)            |
| `/admin/:name/freeze` | DELETE | Unfreeze instance (allow writes)          |
| `/admin/:name/freeze` | GET    | Get freeze status                         |

### Freeze Operations

Freeze functionality is used for instance migration cutover modes. When an instance is frozen:

- `PUT`, `DELETE`, and `IMPORT` operations return `423 Locked`
- Read operations (`GET`, `LIST`, `EXPORT`) continue to work

## DO Manager Setup

1. Install this package and deploy your Worker
2. In [DO Manager](https://do.adamic.tech), add your namespace
3. Enter your **Admin Hook Endpoint URL** (e.g., `https://my-worker.workers.dev`)
4. Admin hooks are automatically enabled when you save
5. View/edit storage, set alarms, and backup your DOs!

## Security

For production, enable authentication:

```typescript
export class SecureDO extends withAdminHooks({
  requireAuth: true,
  adminKey: process.env.ADMIN_KEY,
}) {
  // ...
}
```

Features timing-safe key comparison to prevent timing attacks.

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import {
  withAdminHooks,
  AdminHooksOptions,
  AdminListResponse,
  AdminExportResponse,
} from "do-manager-admin-hooks";
```

## Links

- [DO Manager Demo Site](https://do.adamic.tech) - Web UI for managing Durable Objects
- [DO Manager GitHub](https://github.com/neverinfamous?tab=repositories) - Do Manager GitHub repository
- [NPM](https://www.npmjs.com/package/do-manager-admin-hooks) - Package

## License

MIT
