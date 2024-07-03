/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi } from "@kth/canvas-api";

describe("Simple requests", () => {
  it("Should fail if no token is given", async () => {
    const client = new CanvasApi(process.env.CANVAS_API_URL!, "");

    expect(() => client.get("accounts/1")).rejects.toThrow();
    // await client.get("accounts/1").catch((err) => );
  });
});
