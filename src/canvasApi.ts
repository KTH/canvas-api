/* eslint-disable @typescript-eslint/no-this-alias */
import { FormData, request as undiciRequest } from "undici";
import type { Dispatcher } from "undici";
import {
  CanvasApiPaginationError,
  CanvasApiRequestError,
  CanvasApiResponseError,
  CanvasApiTimeoutError,
  getSlimStackTrace,
  canvasApiErrorDecorator,
} from "./canvasApiError";
import { ExtendedGenerator } from "./extendedGenerator";
import { rateLimitedRequestFactory } from "./rateLimiter";

export class CanvasApiResponse {
  /** HTTP status code from Canvas */
  statusCode: number;

  /** Object with headers */
  headers: Record<string, string | string[] | undefined>;

  /** Parsed body. `undefined` if the response cannot be parsed` */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;

  /**
   * Alias for `json`.
   * @deprecated. Use `json` or `text` instead
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;

  /** Body without parsing */
  text: string;

  constructor() {
    this.statusCode = 0;
    this.headers = {};
    this.json = undefined;
    this.body = undefined;
    this.text = "";
  }

  async parseBody(response: Dispatcher.ResponseData) {
    const text = await response.body.text();

    try {
      this.statusCode = response.statusCode;
      this.headers = response.headers;
      this.text = text;
      this.json = JSON.parse(text);
      this.body = this.json;
    } catch (err) {
      // Do nothing
    }

    return this;
  }
}

export type RequestOptions = {
  timeout?: number;
};

export type QueryParams = Record<string, string | number | (string | number)[]>;

/** Converts an object to something that can be passed as body in a request */
export function normalizeBody(stackTrace: string | undefined, obj: unknown) {
  if (typeof obj === "undefined") {
    return undefined;
  }

  if (obj instanceof FormData) {
    return obj;
  }

  try {
    return JSON.stringify(obj);
  } catch (err) {
    if (err instanceof Error) {
      throw canvasApiErrorDecorator(
        new CanvasApiRequestError(err.message),
        stackTrace
      );
    }
    throw err;
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

let requestWithRateLimitThrottling:
  | ReturnType<typeof rateLimitedRequestFactory>
  | undefined = undefined;
export class CanvasApi {
  __request__: ReturnType<typeof rateLimitedRequestFactory>;

  apiUrl: URL;
  token: string;
  options: RequestOptions;

  constructor(
    apiUrl: string,
    token: string,
    options: RequestOptions & {
      rateLimitIntervalMs?: number;
      disableThrottling?: boolean;
    } = {}
  ) {
    // For correct parsing, check that `apiUrl` contains a trailing slash
    if (!apiUrl.endsWith("/")) {
      this.apiUrl = new URL(apiUrl + "/");
    } else {
      this.apiUrl = new URL(apiUrl);
    }
    const { rateLimitIntervalMs, disableThrottling, ...opts } = options;

    this.token = token;
    this.options = opts;

    // We can disable the rate limit support for individual instances if required
    if (disableThrottling) {
      this.__request__ = undiciRequest;
    } else {
      requestWithRateLimitThrottling ??= rateLimitedRequestFactory({
        limitIntervalMs: rateLimitIntervalMs ?? 1000,
      });
      this.__request__ = requestWithRateLimitThrottling;
    }
  }

  /** Internal function. Low-level function to perform requests to Canvas API */
  private async _request(
    stackTrace: string | undefined,
    endpoint: string,
    method: Dispatcher.HttpMethod,
    params?: QueryParams,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<CanvasApiResponse> {
    let url = new URL(endpoint, this.apiUrl).toString();
    const mergedOptions = { ...this.options, ...options };

    if (params) {
      url += stringifyQueryParameters(params);
    }
    const header = {
      authorization: `Bearer ${this.token}`,
      "User-Agent": "@kth/canvas-api",
      "content-type":
        body instanceof FormData
          ? undefined
          : typeof body === "string"
          ? "text/plain; charset=utf-8"
          : "application/json",
    };

    // The request function is created in the constructor
    const response = await this.__request__(url, {
      method,
      headers: header,
      body: normalizeBody(stackTrace, body),
      signal: mergedOptions.timeout
        ? AbortSignal.timeout(mergedOptions.timeout)
        : null,
    })
      .then((undiciResponse) =>
        new CanvasApiResponse().parseBody(undiciResponse)
      )
      .catch((err) => {
        if (err instanceof DOMException && err.name === "TimeoutError") {
          throw canvasApiErrorDecorator(
            new CanvasApiTimeoutError(),
            stackTrace
          );
        }

        throw canvasApiErrorDecorator(
          new CanvasApiRequestError(err.message),
          stackTrace
        );
      });

    if (response.statusCode >= 400) {
      throw canvasApiErrorDecorator(
        new CanvasApiResponseError(response),
        stackTrace
      );
    }

    return response;
  }

  /** Performs a GET request to a given endpoint */
  async get(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {}
  ): Promise<CanvasApiResponse> {
    // We capture the stack trace here so we can hide the internals of this lib thus
    // making it point directly to the business logic for operational errors.
    const tmpErr = { stack: undefined };
    Error.captureStackTrace(tmpErr, this.get);

    return this._request(
      tmpErr.stack,
      endpoint,
      "GET",
      queryParams,
      undefined,
      options
    );
  }

  listPages(
    endpoint: string,
    queryParams: QueryParams = {},
    options: RequestOptions = {},
    stackTrace: string | undefined = undefined
  ) {
    const t = this;

    stackTrace ??= getSlimStackTrace(this.listPages);

    async function* generator() {
      let url: string | null | undefined = endpoint;

      while (url) {
        const response: CanvasApiResponse = await t._request(
          stackTrace,
          url,
          "GET",
          queryParams,
          undefined,
          options
        );
        yield response;
        url = response.headers.link && getNextUrl(response.headers.link);
        // Query params are only used in the first call with endpoint
        queryParams = {};
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

    const stackTrace = getSlimStackTrace(this.listItems);

    async function* generator() {
      for await (const page of t.listPages(
        endpoint,
        queryParams,
        options,
        stackTrace
      )) {
        if (!Array.isArray(page.json)) {
          throw canvasApiErrorDecorator(
            new CanvasApiPaginationError(page),
            stackTrace
          );
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
    const stackTrace = getSlimStackTrace(this.request);

    if (method === "GET") {
      const err = new TypeError(
        "HTTP GET not allowed for this 'request' method. Use the methods 'get', 'listPages' or 'listItems' instead"
      );
      err.stack = stackTrace;
      throw err;
    }

    return this._request(
      stackTrace,
      endpoint,
      method,
      undefined,
      body,
      options
    );
  }

  async sisImport(attachment: File): Promise<CanvasApiResponse> {
    const formData = new FormData();
    formData.set("attachment", attachment);

    const stackTrace = getSlimStackTrace(this.sisImport);

    return this._request(
      stackTrace,
      "accounts/1/sis_imports",
      "POST",
      undefined,
      formData
    );
  }
}
