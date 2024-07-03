import { request, FormData } from "undici";
import type { Dispatcher } from "undici";
import { readFile } from "node:fs/promises";
import {
  CanvasApiRequestError,
  CanvasApiResponseError,
} from "./canvasApiError";

export type CanvasApiResponseBody =
  | { json: null; text: string }
  | { json: unknown; text: null };

export type CanvasApiResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
} & CanvasApiResponseBody;

async function handleRequest(
  responsePromise: Promise<Dispatcher.ResponseData>
): Promise<CanvasApiResponse> {
  const response = await responsePromise.catch(() => {
    throw new CanvasApiRequestError("");
  });

  if (response.statusCode >= 300) {
    throw new CanvasApiResponseError(response);
  }

  const text = await response.body.text();

  try {
    const json = JSON.parse(text);

    return {
      statusCode: response.statusCode,
      headers: response.headers,
      json,
      text: null,
    };
  } catch (e) {
    return {
      statusCode: response.statusCode,
      headers: response.headers,
      json: null,
      text,
    };
  }
}

export class CanvasApi {
  apiUrl: URL;
  token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = new URL(apiUrl);
    this.token = token;
  }

  async sisImport(attachment: string): Promise<CanvasApiResponse> {
    const file = await readFile(attachment).then(
      (buffer) => new Blob([buffer])
    );

    const formData = new FormData();
    formData.set("attachment", file);

    const endpoint = new URL("accounts/1/sis_import", this.apiUrl);
    return handleRequest(
      request(endpoint, {
        method: "POST",
        body: formData,
      })
    );
  }
}
