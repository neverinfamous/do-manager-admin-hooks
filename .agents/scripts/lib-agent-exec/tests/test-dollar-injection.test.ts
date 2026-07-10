import { test, expect, spyOn } from 'bun:test';
import { ProcessController } from "C:/Users/chris/Desktop/adamic/.agents/scripts/lib-agent-exec/process-controller.ts";
import { ExecPayload } from "C:/Users/chris/Desktop/adamic/.agents/scripts/lib-agent-exec/schema.ts";

test("String.prototype.replace dollar sign injection", async () => {
  const mockExit = spyOn(process, 'exit').mockImplementation((() => {}) as never);
  const mockFetch = spyOn(globalThis, 'fetch').mockImplementation((async (_url: URL | RequestInfo, _options?: RequestInit | undefined) => {
    return new Response("ok");
  }) as never);

  const payload: ExecPayload = {
    type: "command",
    command: "echo",
    args: ["hello"],
    onSuccess: "http://example.com/webhook",
    webhookPayloadTemplate: '{"text": "{{stdout}}"}',
  };

  const controller = new ProcessController(payload, process.cwd(), "echo", ["hello"], {}, null);

  // Inject mock IOController state
  // @ts-expect-error - mock private property
    controller.ioController = {
    stdoutTail: "$&",
    stderrTail: "",
    flushAll: () => {},
    closeFileStreams: async () => {}
  };

  // @ts-expect-error - invoke private property
        await controller.handleFinish(0, null, false);

  expect(mockFetch).toHaveBeenCalled();
  const fetchArgs = mockFetch.mock.calls[0];
  const body = JSON.parse((fetchArgs[1] as RequestInit).body as string);

  console.log("Injected body text:", body.text);
  expect(body.text).toBe("$&"); // Should work securely without bug

  mockExit.mockRestore();
  mockFetch.mockRestore();
});


