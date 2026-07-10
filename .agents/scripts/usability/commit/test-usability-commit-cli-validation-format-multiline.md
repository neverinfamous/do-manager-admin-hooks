# Usability Test: Strict Commit Validation CLI (Message Format - Multiline)

> [!IMPORTANT]
> **STRICT PROTOCOL ENFORCED:** You must parse errors sequentially and never mutate git history. If an accidental commit is created during fuzzing, you must reset it immediately.

## Objective
Verify that the `commit.ts` CLI accepts a valid Conventional Commits format for the `--msg` flag even if the message contains multiple lines (e.g. a subject and a body), as long as the first line is valid and its length is under the limit.

## Instructions

### Phase 1: Fuzzing
1. **Setup Mock Repo:** Create a new directory `<appDataDir>\brain\<conversation-id>\scratch\test-repo-format-multiline` and initialize an empty git repository in it using `git init`.
2. **Valid Multiline Commit:** From within the mock repository, create a scratch file `dummy.txt`, stage it with `git add dummy.txt`, and attempt to run `bun C:\Users\chris\Desktop\adamic\.agents\scripts\commit.ts` with a multiline commit message format (e.g., `--msg "feat(core): subject\n\nbody message that can be quite long"`). Ensure you provide all other mandatory flags correctly (e.g., `--category Changed`, `--impact 0.5`, `--confidence 0.5`, `--validation passed`).

### Phase 2: Meta-Cognitive Debugging
1. Deliberately check the result. Ensure the script succeeds and creates a commit.
2. If it fails, formulate a hypothesis for the failure in a scratch file (`<appDataDir>\brain\<conversation-id>\scratch\hypothesis.txt`).
3. If the validation is broken, fix it in `commit.ts`.

### Phase 3: Cleanup & Commit (Critical)
> [!CAUTION]
> Fuzzing commit scripts can accidentally pollute the repository.
1. Check if a commit was accidentally created using `bun C:\Users\chris\Desktop\adamic\.agents\scripts\get-git-history-json.ts --limit 1` in the mock repo.
2. Delete the mock repository at `<appDataDir>\brain\<conversation-id>\scratch\test-repo-format-multiline` and any other scratch files.
3. If a fix was required to `commit.ts`, stage it in the main repository and commit using `bun C:\Users\chris\Desktop\adamic\.agents\scripts\commit.ts` with valid arguments.
