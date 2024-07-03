import { Dispatcher } from "undici";
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
  // TODO: spec extra fields
  constructor(response: Dispatcher.ResponseData) {
    super("Canvas API response error");

    // TODO: check response data
  }
}

export class CanvasApiRequestError extends CanvasApiError {
  // TODO
}
