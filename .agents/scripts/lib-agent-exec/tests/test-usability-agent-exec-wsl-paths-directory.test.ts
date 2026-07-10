import { test, expect } from 'bun:test';
import { buildCommand } from '../command-builder.ts';

test('properly converts directory paths without trailing backslashes', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'ls',
    args: ['C:\\some\\directory']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  expect(args).toContain('/mnt/c/some/directory');
});

test('properly converts root directory paths', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'ls',
    args: ['C:\\']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  expect(args).toContain('/mnt/c/');
});

test('properly converts directory paths with trailing backslashes', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'ls',
    args: ['C:\\some\\directory\\']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  expect(args).toContain('/mnt/c/some/directory/');
});
