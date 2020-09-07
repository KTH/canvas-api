/// <reference lib="es2018" />
import { Options } from "got";

declare interface ExtendedAsyncIterator<T> extends AsyncIterableIterator<T> {
  /**
   * Convert the iterator into an array (iterates through of all the elements)
   */
  toArray(): Promise<Array<T>>
}

declare interface CanvasClient {
  /**
   * Perform a non-get request to a canvas endpoint
   *
   * @param endpoint endpoint to perform the request. For example "accounts/1/courses"
   * @param method method. For example "POST"
   * @param body body for the request. Should be an object convertible to JSON
   * @param options options for this particular request
   */
  requestUrl(endpoint: string | URL, method: string, body: any, options?: Options): any;

  /**
   * Perform a get request to a single resource
   *
   * @param endpoint endpoint to perform the get request. For example "accounts/1"
   * @param queryString parameters to send as query strings.
   */
  get(endpoint: string | URL, queryString?: object): any;

  /**
   * Perform a get to an endpoint that returns a list of resources
   *
   * @param endpoint endpoint to perform the get request. For example "accounts/1/courses"
   * @param queryString parameters to send as query strings.
   *
   * Returns an async iterator that iterates over every item of every page.
   *
   * Note: each page of the endpoint must respond with an array of items.
   * Otherwise this function will throw an error
   */
  list(endpoint: string | URL, queryString?: object): ExtendedAsyncIterator<object>;

  /**
   * Perform a get request to an endpoint with pagination.
   *
   * @param endpoint endpoint to perform the get request. For example "accounts/1/courses"
   * @param queryString parameters to send as query strings.
   *
   * @returns an async iterator that iterates over every page
   */
  listPaginated(endpoint: string | URL, queryString?: object): ExtendedAsyncIterator<any>;
}

/**
 * Create a Canvas Client
 * @param apiUrl Canvas API base URI
 * @param apiToken Token generated in Canvas
 * @param options Options
 */
export default function Canvas(apiUrl: string, apiToken: string, options: any): CanvasClient;
