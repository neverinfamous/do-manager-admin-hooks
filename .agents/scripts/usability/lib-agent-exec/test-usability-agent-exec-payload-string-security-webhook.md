# Usability Test: Agent-Exec Payload String Security (Webhook)

> [!IMPORTANT]
> **STRICT PROTOCOL ENFORCED:** You must explicitly document your hypotheses before modifying code. You must write an isolated unit test reproducing any failure *before* you apply a fix.

## Objective
Verify that `lib-agent-exec` strictly enforces Zod schema boundaries rejecting null bytes and carriage returns (`\r`) in string fields (`onFailure`, `webhookPayloadTemplate`, `webhookMethod`), to prevent injection attacks and corruption.

## Instructions

### Phase 1: Security Validation
1. **String Fields Security:** Construct payloads testing `onFailure`, `webhookPayloadTemplate`, and `webhookMethod` with strings containing null bytes, carriage returns, and BOMs. Verify that they are cleanly rejected by Zod schema validation.

### Phase 2: Meta-Cognitive Debugging
1. If limit enforcement fails (e.g., process crashes or continues execution with corrupted strings):
   - **Formulate Hypothesis:** Create `<appDataDir>\brain\<conversation-id>\scratch\hypothesis.txt`.
   - **Reproduce:** Add a test case to the test suite in `.agents/scripts/lib-agent-exec/tests`.
   - **Fix:** Update `schema.ts` to enforce the limits via Zod `refine` or regex checks.
2. **Regression Check:** Run `bun run typecheck` and `bun run lint`.

### Phase 3: Cleanup & Commit
1. Delete any scratch artifacts.
2. Commit your fix using `commit.ts`.
