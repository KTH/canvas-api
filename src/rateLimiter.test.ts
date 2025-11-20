import { performance } from "perf_hooks";
import { CanvasApi } from "./canvasApi";
import { MockAgent, setGlobalDispatcher, Interceptable } from "undici";

describe("Rate limiter works", () => {
  let mockPool: Interceptable;

  beforeEach(() => {
    const mockAgent = new MockAgent();
    setGlobalDispatcher(mockAgent);

    mockPool = mockAgent.get("https://canvas.local");
  });

  it("and retries when limit period has reset", async () => {
    mockPool
      .intercept({ path: "/call", method: "GET" })
      .reply(403, "403 Forbidden (Rate Limit Exceeded)");

    mockPool
      .intercept({ path: "/call", method: "GET" })
      .reply(200, '{"msg": "ok"}');

    const canvas = new CanvasApi("https://canvas.local/", "");

    const start = performance.now();
    const res = await canvas.get("call");
    const end = performance.now();

    expect(res.json.msg).toEqual("ok");
    // The reset is evert 1000ms nad calls are resolved locally
    expect(end - start).toBeGreaterThan(900);
    expect(end - start).toBeLessThan(1100);
  });

  it("doesn't consume regular 403 body", async () => {
    mockPool
      .intercept({ path: "/forbidden", method: "GET" })
      .reply(403, "403 Forbidden (Permissions)");

    const canvas = new CanvasApi("https://canvas.local/", "");

    const err = await canvas.get("forbidden").catch((e) => e);

    expect(err.response.statusCode).toEqual(403);
    expect(err.response.text).toEqual("403 Forbidden (Permissions)");
  });

  it("but can be turned off", async () => {
    mockPool
      .intercept({ path: "/call", method: "GET" })
      .reply(403, "403 Forbidden (Rate Limit Exceeded)");

    mockPool
      .intercept({ path: "/call", method: "GET" })
      .reply(200, '{"msg": "ok"}');

    const canvas = new CanvasApi("https://canvas.local/", "", {
      disableThrottling: true,
    });

    const start = performance.now();
    const err = await canvas.get("call").catch((e) => e);
    const res = await canvas.get("call");
    const end = performance.now();

    expect(err).toBeDefined();
    expect(res.json.msg).toEqual("ok");
    // The reset is evert 1000ms nad calls are resolved locally
    expect(end - start).toBeLessThan(50);
  });
});
