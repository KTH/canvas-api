/* eslint-disable @typescript-eslint/no-this-alias */
import { request, FormData } from "undici";
import type { Dispatcher } from "undici";
import {
  CanvasApiPaginationError,
  CanvasApiRequestError,
  CanvasApiResponseError,
} from "./canvasApiError";
import { ExtendedGenerator } from "./extendedGenerator";

export type CanvasApiResponseBody =
  | { json: null; text: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { json: any; text: null };

export type CanvasApiResponse = {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
} & CanvasApiResponseBody;

export type RequestOptions = {
  timeout?: number;
};

export type QueryParams = Record<string, string | number | (string | number)[]>;

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

/** Get the "next" value in a link header */
export function getNextUrl(linkHeader: string | string[]) {
  if (typeof linkHeader === "string") {
    const next =
      linkHeader.split(",").find((l) => l.search(/rel="next"$/) !== -1) || null;

    const url = next && next.match(/<(.*?)>/);
    return url && url[1];
  }

  return null;
}

/**
 * Return query parameters in Canvas accepted format (i.e. "bracket" format)
 *
 * Example:
 *
 * ```
 * stringifyQueryParameters({ role: [3, 10] }); // returns "role[]=3&role[]=10"
 *
 * ```
 */
export function stringifyQueryParameters(parameters: QueryParams) {
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

  return keyValues.length === 0 ? "" : "?" + keyValues.join("&");
}

export class CanvasApi {
  apiUrl: URL;
  token: string;
  options: RequestOptions;

  constructor(apiUrl: string, token: string, options: RequestOptions = {}) {
    // For correct parsing, check that `apiUrl` contains a trailing slash
    if (!apiUrl.endsWith("/")) {
      this.apiUrl = new URL(apiUrl + "/");
    } else {
      this.apiUrl = new URL(apiUrl);
    }
    this.token = token;
    this.options = options;
  }

  /** Internal function. Low-level function to perform requests to Canvas API */
  private async _request(
    endpoint: string,
    method: Dispatcher.HttpMethod,
    params?: QueryParams,
    body?: unknown,
    options: RequestOptions = {}
  ) {
    let url = new URL(endpoint, this.apiUrl).toString();
    const mergedOptions = { ...this.options, ...options };

    if (params) {
      url += stringifyQueryParameters(params);
    }

    const response = await request(url, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
      },
      body: normalizeBody(body),
      signal: mergedOptions.timeout
        ? AbortSignal.timeout(mergedOptions.timeout)
        : null,
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
  async get(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {}
  ): Promise<CanvasApiResponse> {
    return this._request(endpoint, "GET", queryParams, undefined, options);
  }

  listPages(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {}
  ) {
    const t = this;
    async function* generator() {
      const first = await t._request(
        endpoint,
        "GET",
        queryParams,
        undefined,
        options
      );

      yield first;
      let url = first.headers.link && getNextUrl(first.headers.link);

      while (url) {
        const response = await t._request(url, "GET", {}, undefined, options);
        yield response;
        url = response.headers.link && getNextUrl(response.headers.link);
      }
    }

    return new ExtendedGenerator(generator());
  }

  listItems(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {}
  ) {
    const t = this;
    async function* generator() {
      for await (const page of t.listPages(endpoint, queryParams, options)) {
        if (!Array.isArray(page.json)) {
          throw new CanvasApiPaginationError(page);
        }

        for (const element of page.json) {
          yield element;
        }
      }
    }
    return new ExtendedGenerator(generator());
  }

  request(
    endpoint: string,
    method: Dispatcher.HttpMethod,
    body?: unknown,
    options: RequestOptions = {}
  ) {
    if (method === "GET") {
      throw new TypeError(
        "HTTP GET not allowed for this 'request' method. Use the methods 'get', 'listPages' or 'listItems' instead"
      );
    }

    return this._request(endpoint, method, undefined, body, options);
  }

  async sisImport(attachment: Buffer): Promise<CanvasApiResponse> {
    const file = new Blob([attachment]);
    const formData = new FormData();
    formData.set("attachment", file);

    return this._request("accounts/1/sis_imports", "POST", undefined, formData);
  }
}
