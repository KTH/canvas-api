import { CanvasApi, stringifyQueryParameters } from "./canvasApi";
import {
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Dispatcher,
} from "undici";
import { createServer } from "node:http";

describe("queryParameters", () => {
  it("should parse primitives parameters correctly", () => {
    const input = { page: 1, id: "2" };
    const expected = "?page=1&id=2";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  it("should work with empty objects", () => {
    const input = {};
    const expected = "";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  it("should work with one parameter", () => {
    const input = { id: 3 };
    const expected = "?id=3";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  it("should parse array parameters correctly", () => {
    const input = { role: [3, 10] };
    const expected = "?role[]=3&role[]=10";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  it("should work with arrays mixing numbers and strings", () => {
    const input = { role: [3, "10"] };
    const expected = "?role[]=3&role[]=10";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  it("emtpy arrays should be ignored", () => {
    const input = { role: [] };
    const expected = "";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });
});

describe("listItems", () => {
  let defaultAgent: Dispatcher;

  beforeAll(() => {
    const mockAgent = new MockAgent();
    defaultAgent = getGlobalDispatcher();
    setGlobalDispatcher(mockAgent);

    const mockPool = mockAgent.get("https://canvas.local");
    mockPool
      .intercept({ path: "/courses/page1", method: "GET" })
      .reply(200, [1, 2, 3], {
        headers: {
          link: '<https://canvas.local/courses/page2>; rel="next"',
        },
      });

    mockPool
      .intercept({ path: "/courses/page2", method: "GET" })
      .reply(200, [4, 5]);

    mockPool
      .intercept({ path: "/rare-header", method: "GET" })
      .reply(200, [1], {
        headers: {
          link: '<https://canvas.local/courses/page2>; rel="blah"',
        },
      });

    mockPool
      .intercept({
        path: "/assignments/page1",
        method: "GET",
        query: { arg: 1 },
      })
      .reply(200, [1, 2, 3], {
        headers: {
          link: '<https://canvas.local/assignments/page2?other=2>; rel="next"',
        },
      });

    mockPool
      .intercept({
        path: "/assignments/page2",
        method: "GET",
        query: { other: 2 },
      })
      .reply(200, [4, 5]);
  });

  afterAll(() => {
    setGlobalDispatcher(defaultAgent);
  });

  it("returns correct iterable", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const output = await canvas.listItems("courses/page1").toArray();

    expect(output).toEqual([1, 2, 3, 4, 5]);
  });

  it("ignores link headers that are not 'rel=next'", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const output = await canvas.listItems("rare-header").toArray();

    expect(output).toEqual([1]);
  });

  it("uses the URL in header in an opaque way", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const output = await canvas
      .listItems("assignments/page1", { arg: 1 })
      .toArray();

    expect(output).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("`get` can parse JSON response", () => {
  beforeAll(() => {
    const mockAgent = new MockAgent();
    setGlobalDispatcher(mockAgent);

    const mockPool = mockAgent.get("https://canvas.kth.se");
    mockPool
      .intercept({ path: "/example", method: "GET" })
      .reply(200, '{ "hello" : "world" }');

    mockPool
      .intercept({ path: "/example-text", method: "GET" })
      .reply(200, "This is not a { json");
  });

  it("Parsing a valid json", async () => {
    const canvas = new CanvasApi("https://canvas.kth.se/", "");
    const { json, text } = await canvas.get("example");

    expect({ json, text }).toMatchInlineSnapshot(`
      {
        "json": {
          "hello": "world",
        },
        "text": "{ "hello" : "world" }",
      }
    `);
  });

  it("Parsing an invalid json", async () => {
    const canvas = new CanvasApi("https://canvas.kth.se/", "");
    const { json, text } = await canvas.get("example-text");

    expect({ json, text }).toMatchInlineSnapshot(`
      {
        "json": undefined,
        "text": "This is not a { json",
      }
    `);
  });
});

describe("CanvasApiResponseError", () => {
  beforeAll(() => {
    const mockAgent = new MockAgent();
    setGlobalDispatcher(mockAgent);

    const mockPool = mockAgent.get("https://canvas.local");

    mockPool
      .intercept({ path: "/errored", method: "GET" })
      .reply(400, '{"message": "Missing parameters"}');

    mockPool
      .intercept({ path: "/errored", method: "POST" })
      .reply(405, '{ "message": "Method not allowed" }');

    mockPool
      .intercept({ path: "/errored", method: "PUT" })
      .reply(418, "I am a teapot and invalid JSON )");
  });

  it("errored GET request", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const error = await canvas.get("errored").catch((e) => e);

    expect(error?.stack).toMatch(/canvasApi\.test\.ts/g);
    expect(error?.name).toEqual("CanvasApiResponseError");
    expect(error?.response).toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Missing parameters",
        },
        "headers": {},
        "json": {
          "message": "Missing parameters",
        },
        "statusCode": 400,
        "text": "{"message": "Missing parameters"}",
      }
    `);
  });

  it("errored POST request with valid JSON", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const error = await canvas.request("errored", "POST").catch((e) => e);

    expect(error?.stack).toMatch(/canvasApi\.test\.ts/g);
    expect(error?.name).toEqual("CanvasApiResponseError");
    expect(error?.response).toMatchInlineSnapshot(`
      {
        "body": {
          "message": "Method not allowed",
        },
        "headers": {},
        "json": {
          "message": "Method not allowed",
        },
        "statusCode": 405,
        "text": "{ "message": "Method not allowed" }",
      }
    `);
  });

  it("errored PUT request with invalid JSON", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const error = await canvas.request("errored", "PUT").catch((e) => e);

    expect(error?.stack).toMatch(/canvasApi\.test\.ts/g);
    expect(error?.name).toEqual("CanvasApiResponseError");
    expect(error?.response).toMatchInlineSnapshot(`
      {
        "body": undefined,
        "headers": {},
        "json": undefined,
        "statusCode": 418,
        "text": "I am a teapot and invalid JSON )",
      }
    `);
  });
});

describe("method-level timeout", () => {
  let server: ReturnType<typeof createServer>;
  let timeout: ReturnType<typeof setTimeout>;

  // It is not possible to use undici mocks to mock timeouts
  beforeEach(() => {
    server = createServer((req, res) => {
      timeout = setTimeout(() => {
        res.end("hello");
      }, 1000);
    });
    server.listen(0);
  });

  afterEach(() => {
    clearTimeout(timeout);
    server.close();
  });

  it("times out before the response", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const port = (server.address() as any).port;
    const canvas = new CanvasApi(`http://0.0.0.0:${port}/`, "");
    const t1 = Date.now();
    const error = await canvas
      .get("timeout", {}, { timeout: 100 })
      .catch((e) => e);
    const t2 = Date.now();

    expect(error?.name).toEqual("CanvasApiTimeoutError");
    expect(error?.stack).toMatch(/canvasApi\.test\.ts/g);
    expect(t2 - t1).toBeLessThan(120);
  });

  it("overrides globally set timeout", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const port = (server.address() as any).port;
    const canvas = new CanvasApi(`http://0.0.0.0:${port}/`, "", {
      timeout: 1000000,
    });
    const t1 = Date.now();
    const error = await canvas
      .get("timeout", {}, { timeout: 100 })
      .catch((e) => e);
    const t2 = Date.now();

    expect(error?.name).toEqual("CanvasApiTimeoutError");
    expect(error?.stack).toMatch(/canvasApi\.test\.ts/g);
    expect(t2 - t1).toBeLessThan(120);
  });
});
