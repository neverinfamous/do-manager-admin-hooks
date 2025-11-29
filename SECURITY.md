# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: admin@adamic.tech
3. Include detailed steps to reproduce the vulnerability
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond promptly to valid reports.

## Security Considerations

This package exposes admin endpoints on your Durable Object. Consider:

- **Authentication**: Use the `requireAuth` option in production
- **Network Access**: Admin endpoints are only accessible via your Worker URL
- **Data Exposure**: Admin hooks can read/write all storage data

```typescript
// Recommended: Enable authentication in production
export class MyDO extends withAdminHooks({
  requireAuth: true,
  adminKey: process.env.ADMIN_KEY,
}) {
  // ...
}
```

