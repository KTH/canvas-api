/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi, CanvasApiResponseError } from "@kth/canvas-api";
import { z } from "zod";

const accountSchema = z.object({
  id: z.number(),
  name: z.string(),
  workflow_state: z.string(),
});

describe("Simple requests", () => {
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
