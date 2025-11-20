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
  constructor(response = new CanvasApiResponse()) {
    super("Canvas API response error");
    this.name = "CanvasApiResponseError";
    this.response = response;
  }
}

/**
 * Thrown when there was some error with the request
 */
export class CanvasApiRequestError extends CanvasApiError {
  constructor(message?: string) {
    // TODO
    super(
      `Canvas API Request Error: ${
        message ?? "there is something wrong with your request"
      }`
    );
    this.name = "CanvasApiRequestError";
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

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getSlimStackTrace(fnCaller: (...args: any[]) => any) {
  // We capture the stack trace here so we can hide the internals of this lib thus
  // making it point directly to the business logic for operational errors.
  const tmpErr = { stack: undefined };
  Error.captureStackTrace(tmpErr, fnCaller);
  return tmpErr.stack;
}

export function canvasApiErrorDecorator(
  error:
    | CanvasApiPaginationError
    | CanvasApiTimeoutError
    | CanvasApiRequestError,
  stack: string | undefined
) {
  if (stack !== undefined) {
    error.stack = stack.replace("Error", `${error.name}: ${error.message}`);
  }
  return error;
}
