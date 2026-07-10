import { test, expect } from 'bun:test';
import { buildCommand } from '../command-builder.ts';

test('properly converts Windows paths embedded in KEY=value arguments', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'dummy-command',
    args: ['--config=C:\\my\\config.json', 'NODE_ENV=production', 'PATH=C:\\some\\path']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  
  expect(args).toContain('--config=/mnt/c/my/config.json');
  expect(args).toContain('NODE_ENV=production');
  expect(args).toContain('PATH=/mnt/c/some/path');
});

test('properly converts Windows paths embedded in KEY:value arguments', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'dummy-command',
    args: ['--path:C:\\another\\dir']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  expect(args).toContain('--path:/mnt/c/another/dir');
});

test('properly converts Windows paths embedded in KEY="value" arguments', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'dummy-command',
    args: ['--config="C:\\my\\config.json"']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  expect(args).toContain('--config="/mnt/c/my/config.json"');
});

test('properly converts Windows paths embedded in KEY=\'value\' arguments', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'dummy-command',
    args: ["--config='C:\\my\\config.json'"]
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  expect(args).toContain("--config='/mnt/c/my/config.json'");
});

test('leaves unparseable embedded paths unmodified', () => {
  const payload = {
    type: 'command' as const,
    target: 'wsl2' as const,
    command: 'dummy-command',
    args: ['--config~C:\\my\\config.json']
  };

  const { args } = buildCommand(payload, 'C:\\cwd');
  // It shouldn't match the regex so it leaves it unmodified
  expect(args).toContain('--config~C:\\my\\config.json');
});
