export interface ExtendedAsyncGenerator<T>
  extends AsyncGenerator<T, void, unknown> {
  toArray(): Promise<T[]>;
}
export declare function augmentGenerator<T>(
  generator: AsyncGenerator<T>
): ExtendedAsyncGenerator<T>;
