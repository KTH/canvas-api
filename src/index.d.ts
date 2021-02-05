import { ExtendOptions, Got, Method, CancelableRequest, Response } from "got";
import { ExtendedAsyncGenerator } from "./utils";
export default class CanvasAPI {
  canvasClient: Got;
  constructor(apiUrl: string, apiToken: string, options?: ExtendOptions);
  requestUrl<T>(
    endpoint: string,
    method: Method,
    body?: {},
    options?: {}
  ): CancelableRequest<Response<T>>;
  postWithAttachment(
    endpoint: string,
    attachment: string,
    body?: Record<string, any>
  ): CancelableRequest<Response<string>>;
  get<T>(endpoint: string, queryParams?: {}): CancelableRequest<Response<T>>;
  _listPaginated<T>(
    endpoint: string,
    queryParams?: {},
    options?: {}
  ): AsyncGenerator<Response<T>, void, unknown>;
  listPaginated<T>(
    endpoint: string,
    queryParams?: {},
    options?: {}
  ): ExtendedAsyncGenerator<Response<T>>;
  _list<T>(
    endpoint: string,
    queryParams?: {},
    options?: {}
  ): AsyncGenerator<T, void, unknown>;
  list<T>(
    endpoint: string,
    queryParams?: {},
    options?: {}
  ): ExtendedAsyncGenerator<T>;
}
