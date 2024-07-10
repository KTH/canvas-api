import { Dispatcher } from "undici";
import { CanvasApiResponse } from "./canvasApi";
/** Super-class for CanvasApi library */
export class CanvasApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasApiError";
  }
}

/**
 * Thrown when Canvas has returned a non-200 response
 */
export class CanvasApiResponseError extends CanvasApiError {
  response: CanvasApiResponse;

  /**
   * Note: this constructor does not parse the body in `response`.
   * Use {@link CanvasAPIResponseError.fromResponse} instead
   */
  constructor(response: Dispatcher.ResponseData) {
    super("Canvas API response error");
    this.name = "CanvasApiResponseError";
    this.response = {
      statusCode: response.statusCode,
      headers: response.headers,
      json: undefined,
      text: "",
      body: undefined,
    };
  }

  /**
   * Returns a `CanvasApiResponseError` with a parsed response
   */
  static async fromResponse(response: Dispatcher.ResponseData) {
    const error = new CanvasApiResponseError(response);
    const text = await response.body.text();

    // Override the default error message
    switch (response.statusCode) {
      case 401:
        error.message = "Canvas API: 401 Unauthorized";
        break;
      default:
        error.message = "Canvas API: " + response.statusCode;
    }

    error.response.text = text;

    try {
      // TODO: find a good "message" in the body and override `error.message`
      const json = await JSON.parse(text);
      error.response.json = json;
      error.response.body = json;
    } catch (err) {
      // Don't do anything
    }

    return error;
  }
}

/**
 * Thrown when there was some error before reaching Canvas
 */
export class CanvasApiConnectionError extends CanvasApiError {
  constructor() {
    // TODO
    super("Canvas API request error");
    this.name = "CanvasApiConnectionError";
  }
}

/** Thrown when a request times out before getting any response */
export class CanvasApiTimeoutError extends CanvasApiError {
  constructor() {
    super("Canvas API timeout error");
    this.name = "CanvasApiTimeoutError";
  }
}

export class CanvasApiPaginationError extends CanvasApiError {
  response: CanvasApiResponse;

  constructor(response: CanvasApiResponse) {
    super(
      "This endpoint did not responded with a list. Use `listPages` or `get` instead"
    );
    this.response = response;
    this.name = "CanvasApiPaginationError";
  }
}
