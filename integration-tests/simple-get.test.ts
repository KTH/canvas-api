/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi, CanvasApiResponseError } from "@kth/canvas-api";

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
    const response = await client.get("accounts/1");

    expect(response).toMatchInlineSnapshot();
  });
});
