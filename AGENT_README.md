# do-manager-admin-hooks - Agent Briefing

> **Agent Protocol**: This project utilizes specific tooling for deterministic agent interactions and workflow alignment. Read this file carefully before taking action.

## 1. Project Overview

The `do-manager-admin-hooks` project provides npm-installable admin hooks for Cloudflare Durable Objects. It enables integration with DO Manager (do.adamic.tech) to provide admin capabilities like viewing and editing storage, setting alarms, freezing instances, and backing up data.

## 2. Key Project Files

- [README.md](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/README.md) - Project overview and setup
- [UNRELEASED.md](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/UNRELEASED.md) - Pending changes
- [CHANGELOG.md](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/CHANGELOG.md) - Version history
- [SECURITY.md](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/SECURITY.md) - Security policy
- [package.json](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/package.json) - Node.js configuration
- [src/index.ts](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/src/index.ts) - Main entry point
- [eslint.config.js](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/eslint.config.js) - ESLint configuration
- [tsconfig.json](file:///C:/Users/chris/Desktop/do-manager-admin-hooks/tsconfig.json) - TypeScript configuration

## 3. Tooling Standards

- **Package Manager**: Use `pnpm` exclusively.
- **Agent Exec**: Execute shell commands using `lib-agent-exec` native wrapper for PowerShell.
- **Git State**: Query history using `lib-git-history` scripts (`bun .\.agents\scripts\get-git-history-json.ts`).
- **Committing**: Always commit using the workspace `commit.ts` script (`bun .\.agents\scripts\commit.ts`).

## 4. Workflows

When working within this repository, prioritize using established `.agents/workflows` before performing manual multi-step operations. Check the `.agents/workflows` directory for up-to-date procedures.
