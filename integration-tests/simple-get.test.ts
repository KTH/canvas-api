/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi, CanvasApiResponseError } from "@kth/canvas-api";
import { z } from "zod";

const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  workflow_state: z.string(),
});

const enrollmentsSchema = z.array(
  z.object({
    role_id: z.number(),
  })
);

describe("GET requests without parameters", () => {
  it("Should fail if no token is given", async () => {
    const client = new CanvasApi(process.env.CANVAS_API_URL!, "");

    expect(() => client.get("accounts/1")).rejects.toThrowError(
      CanvasApiResponseError
    );
  });

  it("Should not fail if token is given", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!
    );
    const { json, statusCode, text } = await client.get("accounts/1");
    expect(statusCode).toBe(200);
    expect(text).toBeNull();
    expect(accountSchema.parse(json)).toMatchInlineSnapshot(`
      {
        "id": 1,
        "name": "KTH Royal Institute of Technology",
        "workflow_state": "active",
      }
    `);
  });
});

describe("GET requests with query parameters", () => {
  it("should return right results", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!
    );

    const enrollments = await client
      .get("courses/1/enrollments", { role_id: [3, 6], per_page: 50 })
      .then((r) => enrollmentsSchema.parse(r.json));

    const uniqueRoles = new Set(enrollments.map((e) => e.role_id));

    expect(uniqueRoles.size).toBe(2);
    expect(uniqueRoles.has(3)).toBeTruthy();
    expect(uniqueRoles.has(6)).toBeTruthy();
  });
});
