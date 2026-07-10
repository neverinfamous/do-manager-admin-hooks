import { expect, test } from 'bun:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('Agent-Exec Payload Validation - Rejects inline shell wrappers', async () => {
  const cliPath = path.resolve(__dirname, '../agent-exec.ts');
  const payloadPath = path.join(os.tmpdir(), 'test-hallucination-pwsh.json');
  
  const payloadPwsh = {
    type: 'command',
    command: 'pwsh',
    args: ['-c', 'echo "test"']
  };
  fs.writeFileSync(payloadPath, JSON.stringify(payloadPwsh, null, 2));
  
  const procPwsh = Bun.spawn(['bun', 'run', cliPath, payloadPath, '--json'], { stdout: 'pipe', stderr: 'pipe' });
  const errPwsh = await new Response(procPwsh.stderr).text();
  await procPwsh.exited;

  expect(errPwsh).toContain("agent hallucination");
  expect(errPwsh).toContain("Please use the proper execution payloads");

  const payloadBash = {
    type: 'command',
    command: 'bash',
    args: ['-c', 'ls']
  };
  fs.writeFileSync(payloadPath, JSON.stringify(payloadBash, null, 2));

  const procBash = Bun.spawn(['bun', 'run', cliPath, payloadPath, '--json'], { stdout: 'pipe', stderr: 'pipe' });
  const errBash = await new Response(procBash.stderr).text();
  await procBash.exited;

  expect(errBash).toContain("list_dir");

  try { fs.unlinkSync(payloadPath); } catch { /* ignore */ }
});
