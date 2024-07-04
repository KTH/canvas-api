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

export type CanvasApiQueryParameters = Record<
  string,
  string | number | (string | number)[]
>;

/** Converts an object to something that can be passed as body in a request */
export function normalizeBody(obj: unknown) {
  if (typeof obj === "undefined") {
    return undefined;
  }

  if (obj instanceof FormData) {
    return obj;
  }

  try {
    return JSON.stringify(obj);
  } catch (err) {
    throw new CanvasApiRequestError();
  }
}

/**
 * Return query parameters in Canvas accepted format (i.e. "bracket" format)
 *
 * Example:
 *
 * ```
 * queryParameters({ role: [3, 10] }); // returns "role[]=3&role[]=10"
 *
 * ```
 */
export function queryParameters(parameters: CanvasApiQueryParameters) {
  const keyValues: string[] = [];

  for (const key in parameters) {
    const value = parameters[key];

    if (Array.isArray(value)) {
      for (const v of value) {
        keyValues.push(`${key}[]=${v}`);
      }
    } else {
      keyValues.push(`${key}=${value}`);
    }
  }
  return keyValues.join("&");
}

export class CanvasApi {
  apiUrl: URL;
  token: string;

  constructor(apiUrl: string, token: string) {
    // For correct parsing, check that `apiUrl` contains a trailing slash
    if (!apiUrl.endsWith("/")) {
      throw new TypeError("Parameter `apiUrl` must end with trailing slash");
    }
    this.apiUrl = new URL(apiUrl);
    this.token = token;
  }

  /** Internal function. Low-level function to perform requests to Canvas API */
  private async _request(
    endpoint: string,
    method: Dispatcher.HttpMethod,
    body?: unknown
  ) {
    const url = new URL(endpoint, this.apiUrl);
    const response = await request(url, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
      },
      body: normalizeBody(body),
    }).catch(() => {
      throw new CanvasApiRequestError();
    });

    if (response.statusCode >= 300) {
      throw await CanvasApiResponseError.fromResponse(response);
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

  /** Performs a GET request to a given endpoint */
  async get(endpoint: string): Promise<CanvasApiResponse> {
    return this._request(endpoint, "GET");
  }

  async sisImport(attachment: string): Promise<CanvasApiResponse> {
    const file = await readFile(attachment).then(
      (buffer) => new Blob([buffer])
    );

    const formData = new FormData();
    formData.set("attachment", file);

    return this._request("accounts/1/sis_import", "POST", formData);
  }
}
