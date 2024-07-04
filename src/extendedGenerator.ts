export class ExtendedGenerator<T> implements AsyncGenerator<T, void, unknown> {
  private generator: AsyncGenerator<T, void, unknown>;
  constructor(generator: AsyncGenerator<T, void, unknown>) {
    this.generator = generator;
  }

  async toArray(): Promise<T[]> {
    const result: T[] = [];

    for await (const v of this.generator) {
      result.push(v);
    }

    return result;
  }

  filter(predicate: (v: T) => boolean): ExtendedGenerator<T> {
    const g = this.generator;

    async function* newGenerator() {
      for await (const v of g) {
        if (predicate(v)) {
          yield v;
        }
      }
    }

    return new ExtendedGenerator(newGenerator());
  }

  map<V>(callback: (v: T) => V): ExtendedGenerator<V> {
    const gen = this.generator;

    async function* newGenerator() {
      for await (const v of gen) {
        yield callback(v);
      }
    }
    return new ExtendedGenerator(newGenerator());
  }

  take(n: number): ExtendedGenerator<T> {
    const gen = this.generator;

    async function* newGenerator() {
      while (n > 0) {
        const next = await gen.next();
        if (next.done) {
          return next.value;
        }
        yield next.value;
        n--;
      }
    }

    return new ExtendedGenerator(newGenerator());
  }

  // The following methods are required by the `AsyncGenrator` definition:
  next(): Promise<IteratorResult<T, any>> {
    return this.generator.next();
  }
  return(value: any): Promise<IteratorResult<T, any>> {
    return this.generator.return(value);
  }
  throw(e: any): Promise<IteratorResult<T, any>> {
    return this.generator.throw(e);
  }
  [Symbol.asyncIterator](): AsyncGenerator<T, any, unknown> {
    return this.generator[Symbol.asyncIterator]();
  }
}
