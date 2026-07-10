# Usability Test: Agent-Exec Payload Webhook - Error Handling

> [!IMPORTANT]
> **STRICT PROTOCOL ENFORCED:** You must explicitly document your hypotheses before modifying code. You must write an isolated unit test reproducing any failure *before* you apply a fix.

## Objective
Verify that `lib-agent-exec` correctly detects and logs non-2xx HTTP status codes from webhook endpoints.

## Instructions

### Phase 1: Webhook Error Handling Validation
1. **Webhook 500 Error:** Create a payload that invokes a webhook which responds with a 500 Internal Server Error.
2. **Verify Logs:** Ensure that `agent-exec` correctly identifies the HTTP 500 failure and logs a `Webhook Error: HTTP 500` message to standard error, rather than silently ignoring it.

### Phase 2: Meta-Cognitive Debugging
1. If validation or execution fails with these properties:
   - **Formulate Hypothesis:** Create `<appDataDir>\brain\<conversation-id>\scratch\hypothesis.txt`.
   - **Reproduce:** Add a test case to the test suite in `.agents/scripts/lib-agent-exec/tests`.
   - **Fix:** Update `utils.ts` (or relevant code) to check `res.ok` on fetch responses and log appropriate error messages.
2. **Regression Check:** Run `bun run typecheck` and `bun run lint`.

### Phase 3: Cleanup & Commit
1. Delete any scratch artifacts.
2. Commit your fix using `commit.ts`.
