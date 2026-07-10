import { cp, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { existsSync } from "node:fs";

const SYNC_TARGETS = [
  {
    source: "C:\\Users\\chris\\OneDrive\\Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1",
    target: "C:\\Users\\chris\\Desktop\\adamic\\docs\\backups\\Microsoft.PowerShell_profile.bak.ps1",
    name: "PowerShell Profile"
  },
  {
    source: "C:\\Users\\chris\\.gemini\\config\\mcp_config.json",
    target: "C:\\Users\\chris\\Desktop\\adamic\\docs\\mcp-configs\\mcp_config.bak.json",
    name: "MCP Config"
  },
  {
    source: "C:\\Users\\chris\\.gemini\\config\\memory-journal.config.json",
    target: "C:\\Users\\chris\\Desktop\\adamic\\docs\\backups\\memory-journal-config.bak.json",
    name: "Memory Journal Config"
  }
];

async function syncEnv() {
  console.log(`Starting environment sync...`);

  for (const item of SYNC_TARGETS) {
    if (!existsSync(item.source)) {
      console.error(`Source ${item.name} does not exist: ${item.source}`);
      continue;
    }

    const targetDir = dirname(item.target);
    
    if (!existsSync(targetDir)) {
      console.log(`Creating target directory: ${targetDir}`);
      await mkdir(targetDir, { recursive: true });
    }

    try {
      await cp(item.source, item.target, { force: true });
      console.log(`Successfully synced ${item.name} to: ${item.target}`);
    } catch (error) {
      console.error(`Failed to sync ${item.name}:`, error);
      process.exitCode = 1;
    }
  }
}

syncEnv().catch(console.error);
