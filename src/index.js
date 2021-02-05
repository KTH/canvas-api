import got from "got";
import queryString from "qs";
import fs from "fs";
import FormData from "form-data";
import { augmentGenerator } from "./utils.js";

function getNextUrl(linkHeader) {
  const next = linkHeader
    .split(",")
    .find((l) => l.search(/rel="next"$/) !== -1);

  const url = next && next.match(/<(.*?)>/);
  return url && url[1];
}

export default class CanvasAPI {
  constructor(apiUrl, apiToken, options = {}) {
    this.canvasClient = got.extend({
      prefixUrl: apiUrl,
      headers: {
        Authentication: `Bearer ${apiToken}`,
      },
      responseType: "json",
      ...options,
    });
  }

  requestUrl(endpoint, method, body = {}, options = {}) {
    if (method === "GET") {
      throw new Error(
        "requestUrl() cannot be used for GET methods. Use 'get', 'list' or 'listPaginated'"
      );
    }

    return this.canvasClient(endpoint, {
      json: body,
      method,
      ...options,
    });
  }

  postWithAttachment(endpoint, attachment, body = {}) {
    const form = new FormData();

    for (const key in body) {
      form.append(key, body[key]);
    }
    form.append("attachment", fs.createReadStream(attachment));

    return this.canvasClient.post(endpoint, { body: form });
  }

  get(endpoint, queryParams = {}) {
    return this.canvasClient.get(endpoint, {
      searchParams: queryString.stringify(queryParams, {
        arrayFormat: "brackets",
      }),
    });
  }

  async *_listPaginated(endpoint, queryParams = {}, options = {}) {
    const parameters = queryString.stringify(queryParams, {
      arrayFormat: "brackets",
    });

    const first =
      (await this.canvasClient.get) <
      T >
      (endpoint,
      {
        searchParams: parameters,
        ...options,
      });

    yield first;

    let url = getNextUrl(first.headers?.link);

    while (url) {
      const response = await this.canvasClient.get(url, {
        prefixUrl: "",
      });

      yield response;

      url = getNextUrl(response.headers?.link);
    }
  }

  listPaginated(endpoint, queryParams = {}, options = {}) {
    return augmentGenerator(
      this._listPaginated(endpoint, queryParams, options)
    );
  }

  async *_list(endpoint, queryParams = {}, options = {}) {
    for await (const page of this.listPaginated(
      endpoint,
      queryParams,
      options
    )) {
      for (const element of page.body) {
        yield element;
      }
    }
  }

  list(endpoint, queryParams = {}, options = {}) {
    return augmentGenerator(this._list(endpoint, queryParams, options));
  }
}
