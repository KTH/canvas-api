/** Make simple requests (GET, POST, PUT, etc.) to actual Canvas */
import { CanvasApi } from "@kth/canvas-api";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { resolve } from "path";

const sisImportSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  workflow_state: z.string(),
  progress: z.number(),
});

describe("Send SIS Import CSV", () => {
  it("should be sent correctly", async () => {
    const client = new CanvasApi(
      process.env.CANVAS_API_URL!,
      process.env.CANVAS_API_TOKEN!
    );
    const file = new File(
      [await readFile(resolve(__dirname, "./test.csv"))],
      "test.csv"
    );
    const { json, statusCode, text } = await client.sisImport(file);
    expect(statusCode).toBe(200);
    expect(sisImportSchema.safeParse(json)).toBeTruthy();
  }, 10000);
});
