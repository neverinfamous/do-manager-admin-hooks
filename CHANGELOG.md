# Changelog

All notable changes to `do-manager-admin-hooks`.

---

## [Unreleased]

### Added

- **ESLint Configuration**: Added strict TypeScript ESLint configuration matching other manager projects
  - Strict type checking with `strictTypeChecked` and `stylisticTypeChecked` presets
  - Added `lint`, `lint:fix`, and `check` npm scripts
- **Type Exports**: Added `AdminHooksInstance` and `AdminHooksConstructor` types for explicit typing

### Changed

- **Code Quality**: Removed eslint-disable comments by properly typing the codebase
  - Simplified `DurableObjectStorage.put()` overloads to use `unknown` instead of unnecessary generic
  - Added explicit return type `AdminHooksConstructor` to `withAdminHooks()` function
- **Dependencies**: Updated `@cloudflare/workers-types` from 4.20260127.0 to 4.20260203.0
- **Dependencies**: Updated `globals` from 17.1.0 to 17.3.0

---

## [1.1.1] - 2026-01-05

### Fixed

- **Routing fix** for instance name prefixes in admin paths
  - Now supports both `/admin/export` and `/admin/:instanceName/export` formats
  - Fixes instance migration not copying storage keys

---

## [1.1.0] - 2026-01-05

### Added

- **Freeze/Unfreeze endpoints** for instance migration support
  - `PUT /admin/:name/freeze` - Freeze instance (block writes)
  - `DELETE /admin/:name/freeze` - Unfreeze instance (allow writes)
  - `GET /admin/:name/freeze` - Get current freeze status
- When frozen, `PUT`, `DELETE`, and `IMPORT` operations return `423 Locked`
- Required for DO Manager v1.2.0 "Copy + Freeze Source" migration mode

---

## [1.0.1] - 2025-12-01

### Fixed

- Minor documentation updates

---

## [1.0.0] - 2025-11-29

### Added

- Initial release
- **Storage Operations**
  - `GET /admin/list` - List storage keys (KV) or tables (SQLite)
  - `GET /admin/get?key=X` - Get value for a key
  - `POST /admin/put` - Set key-value pair
  - `POST /admin/delete` - Delete a key
- **SQL Operations** (SQLite only)
  - `POST /admin/sql` - Execute SQL query
- **Alarm Operations**
  - `GET /admin/alarm` - Get current alarm
  - `PUT /admin/alarm` - Set alarm
  - `DELETE /admin/alarm` - Delete alarm
- **Bulk Operations**
  - `GET /admin/export` - Export all storage as JSON
  - `POST /admin/import` - Import data from JSON
- Configuration options: `basePath`, `requireAuth`, `adminKey`
- TypeScript support with exported types

---

## Links

- [NPM Package](https://www.npmjs.com/package/do-manager-admin-hooks)
- [GitHub Repository](https://github.com/neverinfamous/do-manager-admin-hooks)
- [DO Manager](https://do.adamic.tech)
