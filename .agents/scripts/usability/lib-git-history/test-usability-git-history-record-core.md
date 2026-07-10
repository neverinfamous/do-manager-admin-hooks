# Usability Test: Git History Analytics (Core Attributes - Header)

> [!IMPORTANT]
> **STRICT PROTOCOL ENFORCED:** You must parse git history non-destructively and never mutate the commit log.

## Objective
Verify that `lib-git-history`'s `parser-record.ts` successfully parses core commit attributes (`commit`, `type`, `scope`) as defined in `entrySchema`.

## Instructions

### Phase 1: Validating Extraction
1. **Extraction:** Create a test commit with a structured message (e.g., `feat(core): subject line\n\nBody paragraph`). Write your message to a scratch file and use `git commit --allow-empty -F <scratch-file>` (or use `bun .\.agents\scripts\commit.ts` with valid args).
2. **Parsing:** Extract the latest commit using `bun .\.agents\scripts\get-git-history-json.ts --limit 1` and redirect to `<appDataDir>\brain\<conversation-id>\scratch\core-header-test.json`.

### Phase 2: Meta-Cognitive Debugging
1. Verify that the output JSON accurately parses the `commit`, `type`, and `scope` fields.
2. If `parser-record.ts` drops or misparses any of these attributes, create a hypothesis in a scratch file.
3. Fix the parsing logic using `ts-pattern` if it is failing. Run `pnpm run check` to ensure no regression.

### Phase 3: Cleanup & Commit
1. **Crucial Cleanup:** Delete your test commit using `git reset --soft HEAD~1`. Delete `core-header-test.json`.
2. Commit any fixes to `lib-git-history` using `bun .\.agents\scripts\commit.ts` with valid arguments.
