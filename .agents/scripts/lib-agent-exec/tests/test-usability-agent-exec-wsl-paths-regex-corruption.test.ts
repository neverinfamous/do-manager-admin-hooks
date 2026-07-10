import { test, expect } from 'bun:test';
import { buildCommand } from '../command-builder.ts';

test('does not corrupt non-path backslashes in regex without spaces', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'dummy-command',
    args: ['-P', '^C:\\path\\to\\file\\.txt\\d+']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  // It should NOT try to aggressively map regexes to WSL paths
  expect(args).toContain('^C:\\path\\to\\file\\.txt\\d+');
});

test('does not corrupt path-like backslashes in regex when using grep/rg', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'grep',
    args: ['-P', 'C:\\path\\to\\file\\.txt\\d+'],
    bypassInterceptors: true
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  // The wsl converter will convert C:\... to /mnt/c/... which breaks regexes
  expect(args).toContain('C:\\path\\to\\file\\.txt\\d+');
});
