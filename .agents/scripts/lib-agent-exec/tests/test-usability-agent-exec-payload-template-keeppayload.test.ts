import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

test("agent-exec deletes payload file if keepPayload is false or undefined", () => {
  const payloadPath = path.resolve(__dirname, "temp-payload-false.json");
  const payload = {
    type: "command",
    command: "echo",
    args: ["test"],
    keepPayload: false,
  };
  fs.writeFileSync(payloadPath, JSON.stringify(payload));
  
  spawnSync(process.execPath, [
    path.resolve(__dirname, "../../agent-exec.ts"),
    payloadPath
  ]);
  
  expect(fs.existsSync(payloadPath)).toBe(false);

  const payloadPathTrue = path.resolve(__dirname, "temp-payload-true.json");
  const payloadTrue = {
    type: "command",
    command: "echo",
    args: ["test"],
    keepPayload: true,
  };
  fs.writeFileSync(payloadPathTrue, JSON.stringify(payloadTrue));
  
  spawnSync(process.execPath, [
    path.resolve(__dirname, "../../agent-exec.ts"),
    payloadPathTrue
  ]);
  
  expect(fs.existsSync(payloadPathTrue)).toBe(true);
  fs.unlinkSync(payloadPathTrue);

  const payloadPathUndefined = path.resolve(__dirname, "temp-payload-undefined.json");
  const payloadUndefined = {
    type: "command",
    command: "echo",
    args: ["test"],
  };
  fs.writeFileSync(payloadPathUndefined, JSON.stringify(payloadUndefined));
  
  spawnSync(process.execPath, [
    path.resolve(__dirname, "../../agent-exec.ts"),
    payloadPathUndefined
  ]);
  
  expect(fs.existsSync(payloadPathUndefined)).toBe(false);
}, 45000);
