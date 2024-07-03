/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi } from "@kth/canvas-api";

describe("Simple requests", () => {
  it("Should fail if no token is given", async () => {
    const client = new CanvasApi(
      "https://kth.test.instructure.com/api/v1/",
      ""
    );

    expect(() => client.get("accounts/1")).rejects.toThrow();
    // await client.get("accounts/1").catch((err) => );
  });
});
