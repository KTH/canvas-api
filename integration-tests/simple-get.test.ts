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
    const { json, statusCode, text } = await client.get("accounts/1");

    expect({ json, statusCode, text }).toMatchInlineSnapshot(`
      {
        "json": {
          "course_template_id": null,
          "default_group_storage_quota_mb": 1000,
          "default_storage_quota_mb": 2000,
          "default_time_zone": "Europe/Stockholm",
          "default_user_storage_quota_mb": 1000,
          "id": 1,
          "name": "KTH Royal Institute of Technology",
          "parent_account_id": null,
          "root_account_id": null,
          "uuid": "ySt5cF5tiEU8j5oIzxT2J98caTu54Vl6y9s6gYdS",
          "workflow_state": "active",
        },
        "statusCode": 200,
        "text": null,
      }
    `);
  });
});
