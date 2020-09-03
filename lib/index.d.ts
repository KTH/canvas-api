/// <reference lib="es2018" />

declare interface ExtendedAsyncIterator<T> extends AsyncIterableIterator<T> {
  /** Convert the iterator into an array (iterates through of all the elements) */
  toArray(): Promise<Array<T>>
}

declare interface CanvasClient {
  /** Perform a non-get request to a canvas endpoint */
  requestUrl(...args: any[]): any;

  /** Perform a get request to a single resource */
  get(...args: any[]): any;

  /** Perform a get to an endpoint that returns a list of resources */
  list(...args: any[]): ExtendedAsyncIterator<any>;

  /** Perform a get request to an endpoint that returns list of resources. */
  listPaginated(...args: any[]): ExtendedAsyncIterator<any>;
}

/**
 * Create a Canvas Client
 * @param apiUrl Canvas API base URI
 * @param apiToken Token generated in Canvas
 * @param options Options
 */
declare function Canvas(apiUrl: string, apiToken: string, options: any): CanvasClient;
export = Canvas;
