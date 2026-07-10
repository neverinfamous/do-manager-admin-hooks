import { cp, mkdir, rm, readdir, chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

const DESKTOP_DIR = "C:\\Users\\chris\\Desktop";
const SOURCE_DIR = join(DESKTOP_DIR, "adamic", ".agents");

const TARGET_REPOS = [
  "adamic-blog",
  "wiki-search-worker",
  "memory-journal-mcp",
  "mysql-mcp",
  "db-mcp",
  "postgres-mcp",
  "d1-manager",
  "do-manager",
  "kv-manager",
  "R2-Manager-Worker",
  "container-manager",
  "worker-manager",
  "do-manager-admin-hooks",
  "do-test-worker",
];

async function syncWorkflows() {
  console.log(`Starting agent ecosystem sync from: ${SOURCE_DIR}`);

  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory does not exist: ${SOURCE_DIR}`);
    process.exit(1);
  }

  for (const repo of TARGET_REPOS) {
    const targetRepoDir = join(DESKTOP_DIR, repo);
    
    // Skip if the repo doesn't exist
    if (!existsSync(targetRepoDir)) {
      console.warn(`Skipping ${repo} - repository directory does not exist: ${targetRepoDir}`);
      continue;
    }

    const targetPath = join(targetRepoDir, ".agents");
    
    console.log(`Syncing agent ecosystem to: ${repo}`);
    try {
      // 1. Backup local .jsonl files from target before wiping
      const backups: { name: string, content: Buffer }[] = [];
      if (existsSync(targetPath)) {
        const entries = await readdir(targetPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            const content = await readFile(join(targetPath, entry.name));
            backups.push({ name: entry.name, content });
          }
        }
        await rm(targetPath, { recursive: true, force: true });
      }
      await mkdir(targetPath, { recursive: true });

      // 2. Copy source, excluding .jsonl files
      await cp(SOURCE_DIR, targetPath, { 
        recursive: true, 
        force: true,
        filter: (src) => !src.endsWith('.jsonl')
      });

      // 3. Restore local .jsonl backups
      if (backups.length > 0) {
        for (const backup of backups) {
          await writeFile(join(targetPath, backup.name), backup.content);
        }
      }

      // 4. Make files read-only (skipping .jsonl files)
      async function makeReadOnly(dir: string) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isDirectory()) {
            await makeReadOnly(fullPath);
          } else if (!entry.name.endsWith('.jsonl')) {
            await chmod(fullPath, 0o444);
          }
        }
      }
      await makeReadOnly(targetPath);
    } catch (error) {
      console.error(`Failed to sync to ${repo}:`, error);
    }
  }

  console.log("Agent ecosystem sync completed successfully.");
}

syncWorkflows().catch(console.error);
