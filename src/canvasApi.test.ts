import { CanvasApi, stringifyQueryParameters } from "./canvasApi";
import {
  MockAgent,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Dispatcher,
} from "undici";

describe("queryParameters", () => {
  test("should parse primitives parameters correctly", () => {
    const input = { page: 1, id: "2" };
    const expected = "?page=1&id=2";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  test("should work with empty objects", () => {
    const input = {};
    const expected = "";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  test("should work with one parameter", () => {
    const input = { id: 3 };
    const expected = "?id=3";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  test("should parse array parameters correctly", () => {
    const input = { role: [3, 10] };
    const expected = "?role[]=3&role[]=10";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  test("should work with arrays mixing numbers and strings", () => {
    const input = { role: [3, "10"] };
    const expected = "?role[]=3&role[]=10";
    expect(stringifyQueryParameters(input)).toEqual(expected);
  });

  test("emtpy arrays should be ignored", () => {
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

  test("returns correct iterable", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const output = await canvas.listItems("courses/page1").toArray();

    expect(output).toEqual([1, 2, 3, 4, 5]);
  });

  test("ignores link headers that are not 'rel=next'", async () => {
    const canvas = new CanvasApi("https://canvas.local/", "");
    const output = await canvas.listItems("rare-header").toArray();

    expect(output).toEqual([1]);
  });

  test("uses the URL in header in an opaque way", async () => {
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

    // mockPool
    //   .intercept({ path: "/example-text", method: "GET" })
    //   .reply(200, "This is not a { json");
  });

  test("Parsing a valid json", async () => {
    const canvas = new CanvasApi("https://canvas.kth.se/", "");
    const { json, text } = await canvas.get("example");

    expect({ json, text }).toMatchInlineSnapshot(`
      {
        "json": {
          "hello": "world",
        },
        "text": null,
      }
    `);
  }, 10000);
});
