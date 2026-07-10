---
description: Sync local environment settings (PowerShell profile, MCP configs, and Memory Journal config) to the adamic docs directories
---

# Sync Environment

This workflow syncs the local Windows PowerShell profile and Memory Journal configuration into the `adamic/docs/backups` directory, and the global IDE MCP configuration into the `adamic/docs/mcp-configs` directory. This is useful for preserving environment-specific configurations locally. Ensure that any sensitive API keys or credentials are removed or replaced with placeholders before tracking in Git (note: `docs/mcp-configs` is strictly ignored by Git due to sensitive credentials).

## 1. Execution

Run the `sync-env.ts` script to execute the sync.

```pwsh
bun C:\Users\chris\Desktop\adamic\.agents\scripts\sync-env.ts
```

## 2. Validation

Review the script's output to verify that the files were copied successfully. The script will automatically create the target directories if they do not already exist.

Ensure that the target files are correctly placed:
- **PowerShell Profile** (`docs\backups\Microsoft.PowerShell_profile.bak.ps1`): Because any sensitive passwords have been stripped out (replaced with placeholders), this file is tracked in Git to maintain a version history of the local environment setup.
- **Memory Journal Config** (`docs\backups\memory-journal-config.bak.json`): Contains non-sensitive IDE configuration and is safely tracked in Git.
- **MCP Config** (`docs\mcp-configs\mcp_config.bak.json`): This file contains live API keys and passwords, so it is strictly ignored by Git via `.gitignore` and `.dockerignore`.
