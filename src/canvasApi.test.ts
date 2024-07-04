import { queryParameters } from "./canvasApi";

describe("queryParameters", () => {
  test("should parse primitives parameters correctly", () => {
    const input = { page: 1, id: "2" };
    const expected = "page=1&id=2";
    expect(queryParameters(input)).toEqual(expected);
  });

  test("should work with empty objects", () => {
    const input = {};
    const expected = "";
    expect(queryParameters(input)).toEqual(expected);
  });

  test("should work with one parameter", () => {
    const input = { id: 3 };
    const expected = "id=3";
    expect(queryParameters(input)).toEqual(expected);
  });

  test("should parse array parameters correctly", () => {
    const input = { role: [3, 10] };
    const expected = "role[]=3&role[]=10";
    expect(queryParameters(input)).toEqual(expected);
  });

  test("should work with arrays mixing numbers and strings", () => {
    const input = { role: [3, "10"] };
    const expected = "role[]=3&role[]=10";
    expect(queryParameters(input)).toEqual(expected);
  });

  test("emtpy arrays should be ignored", () => {
    const input = { role: [] };
    const expected = "";
    expect(queryParameters(input)).toEqual(expected);
  });
});
