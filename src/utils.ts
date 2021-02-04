export interface ExtendedAsyncGenerator<T>
  extends AsyncGenerator<T, void, unknown> {
  toArray(): Promise<T[]>;
}

export function augmentGenerator<T>(
  generator: AsyncGenerator<T>
): ExtendedAsyncGenerator<T> {
  return Object.assign(generator, {
    async toArray() {
      const result = [];

      for await (const v of generator) {
        result.push(v);
      }

      return result;
    },
  });
}
