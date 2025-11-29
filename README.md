# @do-manager/admin-hooks

Admin hooks for Cloudflare Durable Objects that enable integration with [Durable Object Manager](https://do.adamic.tech).

## Installation

```bash
npm install @do-manager/admin-hooks
```

## Quick Start

```typescript
import { withAdminHooks } from '@do-manager/admin-hooks';

export class MyDurableObject extends withAdminHooks() {
  async fetch(request: Request): Promise<Response> {
    // Handle admin requests first (required for DO Manager)
    const adminResponse = await this.handleAdminRequest(request);
    if (adminResponse) return adminResponse;

    // Your custom logic here
    const url = new URL(request.url);
    
    if (url.pathname === '/increment') {
      const count = (await this.state.storage.get<number>('count')) ?? 0;
      await this.state.storage.put('count', count + 1);
      return Response.json({ count: count + 1 });
    }

    return new Response('Hello from my Durable Object!');
  }
}
```

## Configuration Options

```typescript
export class SecureDO extends withAdminHooks({
  // Change the base path for admin endpoints (default: '/admin')
  basePath: '/admin',
  
  // Require authentication for admin endpoints
  requireAuth: true,
  adminKey: 'your-secret-key',
}) {
  // ...
}
```

## Admin Endpoints

Once you extend `withAdminHooks()`, your Durable Object automatically exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/list` | GET | List all storage keys (KV) or tables (SQLite) |
| `/admin/get?key=X` | GET | Get value for a specific key |
| `/admin/put` | POST | Set a key-value pair (`{ key, value }`) |
| `/admin/delete` | POST | Delete a key (`{ key }`) |
| `/admin/sql` | POST | Execute SQL query (`{ query }`) - SQLite only |
| `/admin/alarm` | GET | Get current alarm timestamp |
| `/admin/alarm` | PUT | Set alarm (`{ timestamp }`) |
| `/admin/alarm` | DELETE | Delete alarm |
| `/admin/export` | GET | Export all storage data as JSON |
| `/admin/import` | POST | Import data (`{ data: {...} }`) |

## DO Manager Setup

1. Deploy your Worker with the admin hooks
2. In DO Manager, add your namespace
3. Set the **Admin Hook Endpoint URL** to your Worker's URL (e.g., `https://my-worker.my-subdomain.workers.dev`)
4. Enable the admin hook toggle
5. You can now view/edit storage, set alarms, and backup your DOs!

## With Authentication

If you enable `requireAuth`, DO Manager will need to send the admin key in requests. Set this in your namespace settings.

```typescript
export class SecureDO extends withAdminHooks({
  requireAuth: true,
  adminKey: process.env.ADMIN_KEY ?? 'fallback-key',
}) {
  // ...
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import { 
  withAdminHooks, 
  AdminHooksOptions,
  AdminListResponse,
  AdminExportResponse 
} from '@do-manager/admin-hooks';
```

## License

MIT

