import { request, FormData } from "undici";
import { readFile } from "node:fs/promises";

export type CanvasApiResponse = {
  statusCode: number;
  headers: Map<string, string | string[]>;
  body: unknown;
};

export class CanvasApi {
  apiUrl: URL;
  token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = new URL(apiUrl);
    this.token = token;
  }

  async sisImport(attachment: string) {
    const file = await readFile(attachment).then(
      (buffer) => new Blob([buffer])
    );

    const formData = new FormData();
    formData.set("attachment", file);

    const endpoint = new URL("accounts/1/sis_import", this.apiUrl);
    const response = await request(endpoint, {
      method: "POST",
      body: formData,
    });

    return {
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body.json(),
    };
  }
}
