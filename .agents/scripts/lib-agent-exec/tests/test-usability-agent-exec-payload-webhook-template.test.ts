import { expect, test } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('webhookPayloadTemplate validation with agent-exec', async () => {
  let webhookCalled = false;
  let receivedBody = '';

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      webhookCalled = true;
      receivedBody = await req.text();
      return new Response('OK');
    },
  });

  const payloadPath = path.join(os.tmpdir(), `test-webhook-template-bug-${Date.now()}-${Math.random()}.json`);
  
  // Create a payload with a webhookPayloadTemplate object (or string?)
  // Let's try passing an object first, maybe that's what users do.
  const payload = {
    type: 'command',
    command: 'echo',
    args: ['hello'],
    onSuccess: `http://localhost:${server.port}/webhook`,
    webhookPayloadTemplate: {
       "status": "success",
       "data": { "stdout": "{{stdout}}" }
    }
  };
  fs.writeFileSync(payloadPath, JSON.stringify(payload, null, 2));

  const cliPath = path.resolve(__dirname, '../agent-exec.ts');
  
  const proc = Bun.spawn(['bun', 'run', cliPath, payloadPath, '--json'], { stdout: 'pipe', stderr: 'pipe' });
  let result = '';
  try {
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    result = out + '\n' + err;
  } catch (err: unknown) {
    console.error('Spawn error', err);
  }
  await proc.exited;

  server.stop();
  try { fs.unlinkSync(payloadPath); } catch { /* ignore */ }

  console.log("Result:", result);
  expect(result).not.toContain('Payload schema validation failed');
  expect(webhookCalled).toBe(true);
  
  // Verify the payload template was parsed and substituted correctly
  console.log("Received Webhook Body:", receivedBody);
  const parsedBody = JSON.parse(receivedBody);
  expect(parsedBody.status).toBe('success');
  expect(parsedBody.data.stdout.trim()).toBe('hello');
});
