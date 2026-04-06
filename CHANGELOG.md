# Changelog

All notable changes to `do-manager-admin-hooks`.

---

## [Unreleased](https://github.com/neverinfamous/do-manager-admin-hooks/compare/v1.1.5...HEAD)

---

## [1.1.5](https://github.com/neverinfamous/do-manager-admin-hooks/releases/tag/v1.1.5) - 2026-04-06

### Changed

**Dependency Updates**

- Bumped `@cloudflare/workers-types` from `4.20260317.1` to `4.20260405.1`
- Bumped `eslint` from `10.0.3` to `10.2.0`
- Bumped `typescript` from `5.9.3` to `6.0.2`
- Bumped `typescript-eslint` from `8.57.1` to `8.58.0`

### Security

- Fixed Method Injection vulnerability in POSIX character classes in `picomatch` via exact constraint override.
- Fixed Prototype Pollution vulnerability in `flatted` via exact constraint override.
- Fixed Zero-step sequence process hang vulnerability in `brace-expansion` via `npm audit fix`.

---

## [1.1.4](https://github.com/neverinfamous/do-manager-admin-hooks/releases/tag/v1.1.4) - 2026-03-17

### Changed

- **Dependency Updates**
  - Bumped `@cloudflare/workers-types` to `^4.20260317.1`
  - Bumped `typescript-eslint` to `^8.57.1`

---

## [1.1.3] - 2026-03-10

### Changed

**Dependency Updates**

- Updated `@cloudflare/workers-types` to `4.20260310.1`
- Updated `eslint` to `10.0.3`
- Updated `typescript-eslint` to `8.57.0`

---

## [1.1.2] - 2026-03-01

### Added

- **ESLint Configuration**: Added strict TypeScript ESLint configuration matching other manager projects
  - Strict type checking with `strictTypeChecked` and `stylisticTypeChecked` presets
  - Added `lint`, `lint:fix`, and `check` npm scripts
- **Type Exports**: Added `AdminHooksInstance` and `AdminHooksConstructor` types for explicit typing

### Changed

- **Code Quality**: Removed eslint-disable comments by properly typing the codebase
  - Simplified `DurableObjectStorage.put()` overloads to use `unknown` instead of unnecessary generic
  - Added explicit return type `AdminHooksConstructor` to `withAdminHooks()` function
- **Dependencies**: Migrated ESLint from v9 to v10 (`eslint` 9.39.2 → 10.0.1, `@eslint/js` 9.39.2 → 10.0.1)
- **Dependencies**: Updated `@cloudflare/workers-types` from 4.20260210.0 to 4.20260305.0
- **Dependencies**: Updated `typescript-eslint` from 8.55.0 to 8.56.1
- **Dependencies**: Updated `eslint` from 10.0.1 to 10.0.2
- **Dependencies**: Updated `globals` from 17.3.0 to 17.4.0

### Fixed

- **Security**: Bumped `minimatch` override (`>=10.2.1` → `>=10.2.4`) to patch GLOBSTAR combinatorial backtracking ReDoS in transitive dependency

### Documentation

- Updated README and GitHub README dates

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
