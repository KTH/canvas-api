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
  constructor(stack: string | undefined, response = new CanvasApiResponse()) {
    super("Canvas API response error");
    this.name = "CanvasApiResponseError";
    if (stack !== undefined) {
      this.stack = stack.replace("Error", `${this.name}: ${this.message}`);
    }
    this.response = response;
  }
}

/**
 * Thrown when there was some error before reaching Canvas
 */
export class CanvasApiConnectionError extends CanvasApiError {
  constructor(stack?: string | undefined) {
    // TODO
    super(
      "Canvas API Connection Error: some error happen before reaching Canvas API"
    );
    this.name = "CanvasApiConnectionError";
    if (stack !== undefined) {
      this.stack = stack.replace("Error", `${this.name}: ${this.message}`);
    }
  }
}

/** Thrown when a request times out before getting any response */
export class CanvasApiTimeoutError extends CanvasApiError {
  constructor(stack?: string | undefined) {
    super("Canvas API timeout error");
    this.name = "CanvasApiTimeoutError";
    if (stack !== undefined) {
      this.stack = stack.replace("Error", `${this.name}: ${this.message}`);
    }
  }
}

export class CanvasApiPaginationError extends CanvasApiError {
  response: CanvasApiResponse;

  constructor(stack: string | undefined, response: CanvasApiResponse) {
    super(
      "This endpoint did not responded with a list. Use `listPages` or `get` instead"
    );
    this.response = response;
    this.name = "CanvasApiPaginationError";
  }
}

export function getSlimStackTrace(fnCaller: Function) {
  // We capture the stack trace here so we can hide the internals of this lib thus
  // making it point directly to the business logic for operational errors.
  const tmpErr = { stack: undefined };
  Error.captureStackTrace(tmpErr, fnCaller);
  return tmpErr.stack;
}