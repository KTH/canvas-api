/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi } from "@kth/canvas-api";

describe("POST requests with body parameters", () => {
  it("should return right results", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!
    );

    const enrollments = await client.request("courses/1/enrollments", "POST", {
      enrollment: {
        user_id: "27505",
        role_id: "3",
        enrollment_state: "active",
      },
    });
    expect(enrollments.statusCode).toEqual(200);
  }, 10000);
});
