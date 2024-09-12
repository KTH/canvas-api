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
  constructor(response: CanvasApiResponse) {
    super("Canvas API response error");
    this.name = "CanvasApiResponseError";
    this.response = response;
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
