import { expect, test } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('Webhook Validation with HTTP 500 error', async () => {
  let webhookCalled = false;

  const server = Bun.serve({
    port: 0,
    fetch() {
      webhookCalled = true;
      return new Response('Internal Server Error', { status: 500 });
    },
  });

  const payloadPath = path.join(os.tmpdir(), 'test-webhook-error.json');
  const payload = {
    type: 'eval',
    code: 'process.exit(1);',
    interpreter: 'node',
    onFailure: `http://localhost:${server.port}/webhook`
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

  expect(webhookCalled).toBe(true);
  expect(result).toContain('Webhook Error: HTTP 500');
});
