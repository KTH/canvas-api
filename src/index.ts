import { Readable } from "stream";
import got, {
  ExtendOptions,
  Got,
  Method,
  OptionsOfJSONResponseBody,
  Response,
  HTTPError,
} from "got";
import queryString from "query-string";
import { FormData, fileFromPath } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import fs from "fs/promises";
import type { SisImportResponse } from "./sisImport";

import { extendGenerator, ExtendedGenerator, CanvasApiError } from "./utils";

console.warn(
  "Warning! The TS-release of 3.x is deprecated and won't be officially released. Use 4.x instead, there is a pre-release available that is API-compatible to this."
);

function getNextUrl(linkHeader: string | string[]) {
  if (typeof linkHeader === "string") {
    const next =
      linkHeader.split(",").find((l) => l.search(/rel="next"$/) !== -1) || null;

    const url = next && next.match(/<(.*?)>/);
    return url && url[1];
  }

  return null;
}

function errorHandler(err: unknown): never {
  if (err instanceof HTTPError) {
    throw new CanvasApiError(err);
  }

  throw err;
}

export default class CanvasAPI {
  public gotClient: Got;

  /**
   * Creates a `CanvasAPI` instance
   */
  constructor(apiUrl: string, apiToken: string, options: ExtendOptions = {}) {
    this.gotClient = got.extend({
      prefixUrl: apiUrl,
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      responseType: "json",
      ...options,
    });
  }

  /** Returns the Got instance used for every request */
  get client(): Got {
    return this.gotClient;
  }

  /**
   * Perform a request to a non-GET endpoint.
   * Use `get`, `list`, `listPaginated` to perform GET requests
   */
  async request<T>(
    endpoint: string,
    method: Method,
    body: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): Promise<Response<T>> {
    if (method === "GET") {
      throw new Error(
        "You cannot make a GET request with `requestUrl`. Use `get`, `list` or `listPaginated` instead"
      );
    }

    return this.gotClient<T>(endpoint, {
      method,
      json: body,
      ...options,
    }).catch(errorHandler);
  }

  /** @deprecated Use `request` instead */
  async requestUrl<T>(
    endpoint: string,
    method: Method,
    body: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): Promise<Response<T>> {
    process.emitWarning(
      "Method `requestUrl` will soon stop working. " +
        "Use `request` (with same parameters) instead",
      "DeprecationWarning"
    );
    return this.request(endpoint, method, body, options);
  }

  /**
   * Imports SIS Data from a CSV file. The request will be made to
   * /accounts/1/sis_import.
   *
   * Note: the request will be made without any extra parameters (like "import_type").
   * If you need such parameters, perform a custom request using `requestUrl`.
   *
   * Read more about the sis_imports endpoint: https://canvas.instructure.com/doc/api/sis_imports.html#method.sis_imports_api.create
   */
  async sisImport(
    attachment: string,
    options: OptionsOfJSONResponseBody = {}
  ): Promise<Response<SisImportResponse>> {
    const fd = new FormData();
    await fs.access(attachment);
    fd.set("attachment", await fileFromPath(attachment));
    const formDataEncoder = new FormDataEncoder(fd);

    return this.gotClient
      .post<SisImportResponse>("accounts/1/sis_import", {
        body: Readable.from(formDataEncoder),
        headers: formDataEncoder.headers,
        ...options,
      })
      .catch(errorHandler);
  }

  /**
   * @deprecated. Use `sisImport` or `request` instead
   */
  async sendSis<T>(
    endpoint: string,
    attachment: string,
    body: Record<string, unknown> = {}
  ): Promise<Response<T>> {
    process.emitWarning(
      "Method `sendSis` will stop working soon. Use `sisImport` or `request`",
      "DeprecationWarning"
    );
    const fd = new FormData();

    // eslint-disable-next-line guard-for-in
    for (const key in body) {
      fd.set(key, body[key]);
    }

    await fs.access(attachment);
    fd.set("attachment", await fileFromPath(attachment));

    const encoder = new FormDataEncoder(fd);

    return this.gotClient.post<T>(endpoint, {
      body: Readable.from(encoder),
      headers: encoder.headers,
    });
  }

  /**
   * Performs a non-paginated get request
   */
  async get<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): Promise<Response<T>> {
    return this.gotClient
      .get<T>(endpoint, {
        searchParams: queryString.stringify(queryParams, {
          arrayFormat: "bracket",
        }),
        ...options,
      })
      .catch(errorHandler);
  }

  // Note: the public version of this method returns an
  // ExtendedGenerator instead of a normal AsyncGenerator
  private async *_listPages<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): AsyncGenerator<Response<T>> {
    try {
      const first = await this.gotClient.get<T>(endpoint, {
        searchParams: queryString.stringify(queryParams, {
          arrayFormat: "bracket",
        }),
        ...options,
      });

      yield first;
      let url = first.headers.link && getNextUrl(first.headers.link);

      while (url) {
        // eslint-disable-next-line no-await-in-loop
        const response = await this.gotClient.get<T>(url, {
          prefixUrl: "",
          ...options,
        });

        yield response;
        url = response.headers.link && getNextUrl(response.headers.link);
      }
    } catch (err) {
      errorHandler(err);
    }
  }

  /**
   * Performs a GET request to a "paginated" endpoint. Returns an `ExtendedGenerator`
   * that iterates through every page
   */
  listPages<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): ExtendedGenerator<Response<T>> {
    return extendGenerator(this._listPages(endpoint, queryParams, options));
  }

  // Note: drop this function when listPaginated is also dropped
  private async *_listPaginated<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): AsyncGenerator<T> {
    for await (const page of this._listPages<T>(
      endpoint,
      queryParams,
      options
    )) {
      yield page.body;
    }
  }

  /** @deprecated. Use `listPages` instead */
  listPaginated<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): ExtendedGenerator<T> {
    process.emitWarning(
      "Method `listPaginated` will soon stop working. Please use `listPages` instead. " +
        "Note that `listPages` returns `Response` objects instead of just the body.",
      "DeprecationWarning"
    );
    return extendGenerator(this._listPaginated(endpoint, queryParams, options));
  }

  // Note: the public version of this method returns an
  // ExtendedGenerator instead of a normal AsyncGenerator
  private async *_listItems<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): AsyncGenerator<T> {
    for await (const page of this._listPages<Array<T>>(
      endpoint,
      queryParams,
      options
    )) {
      if (!Array.isArray(page.body)) {
        throw new Error(
          `The function ".listItems()" should be used with endpoints that return arrays. Use "get()" or "listPages" instead with the endpoint [${endpoint}].`
        );
      }

      for (const element of page.body) {
        yield element;
      }
    }
  }

  /**
   * Performs a paginated get request. Returns an iterator that traverse
   * through every element of each thing returned by every page.
   *
   * If you need the pages instead of the elements, use `listPages` instead
   */
  listItems<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): ExtendedGenerator<T> {
    return extendGenerator(this._listItems(endpoint, queryParams, options));
  }

  /** @deprecated Use "listItems" instead */
  list<T>(
    endpoint: string,
    queryParams: Record<string, unknown> = {},
    options: OptionsOfJSONResponseBody = {}
  ): ExtendedGenerator<T> {
    process.emitWarning(
      "Method `list` will soon stop working. " +
        "Please use `listItems` instead with the same arguments",
      "DeprecationWarning"
    );
    return this.listItems(endpoint, queryParams, options);
  }
}

module.exports = CanvasAPI;

export { CanvasApiError, ExtendedGenerator };
