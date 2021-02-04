import got, { ExtendOptions, Got, Method } from "got";
import queryString from "qs";
import fs from "fs";
import FormData from "form-data";
import { augmentGenerator } from "./utils";

function getNextUrl(linkHeader: string) {
  const next = linkHeader
    .split(",")
    .find((l) => l.search(/rel="next"$/) !== -1);

  const url = next && next.match(/<(.*?)>/);
  return url && url[1];
}

export default class CanvasAPI {
  canvasClient: Got;

  constructor(apiUrl: string, apiToken: string, options: ExtendOptions = {}) {
    this.canvasClient = got.extend({
      prefixUrl: apiUrl,
      headers: {
        Authentication: `Bearer ${apiToken}`,
      },
      responseType: "json",
      ...options,
    });
  }

  requestUrl<T>(endpoint: string, method: Method, body = {}, options = {}) {
    if (method === "GET") {
      throw new Error(
        "requestUrl() cannot be used for GET methods. Use 'get', 'list' or 'listPaginated'"
      );
    }

    return this.canvasClient<T>(endpoint, {
      json: body,
      method,
      ...options,
    });
  }

  postWithAttachment(
    endpoint: string,
    attachment: string,
    body: Record<string, any> = {}
  ) {
    const form = new FormData();

    for (const key in body) {
      form.append(key, body[key]);
    }
    form.append("attachment", fs.createReadStream(attachment));

    return this.canvasClient.post(endpoint, { body: form });
  }

  get<T>(endpoint: string, queryParams = {}) {
    return this.canvasClient.get<T>(endpoint, {
      searchParams: queryString.stringify(queryParams, {
        arrayFormat: "brackets",
      }),
    });
  }

  async *_listPaginated<T>(endpoint: string, queryParams = {}, options = {}) {
    const parameters = queryString.stringify(queryParams, {
      arrayFormat: "brackets",
    });

    const first = await this.canvasClient.get<T>(endpoint, {
      searchParams: parameters,
      ...options,
    });

    yield first;

    let url = getNextUrl(first.headers?.link as string);

    while (url) {
      const response = await this.canvasClient.get<T>(url, {
        prefixUrl: "",
      });

      yield response;

      url = getNextUrl(response.headers?.link as string);
    }
  }

  listPaginated<T>(endpoint: string, queryParams = {}, options = {}) {
    return augmentGenerator(
      this._listPaginated<T>(endpoint, queryParams, options)
    );
  }

  async *_list<T>(endpoint: string, queryParams = {}, options = {}) {
    for await (const page of this.listPaginated<T[]>(
      endpoint,
      queryParams,
      options
    )) {
      for (const element of page.body) {
        yield element;
      }
    }
  }

  list<T>(endpoint: string, queryParams = {}, options = {}) {
    return augmentGenerator(this._list<T>(endpoint, queryParams, options));
  }
}
