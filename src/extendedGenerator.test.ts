import { ExtendedGenerator } from "./extendedGenerator";

test("extendGenerator returns a valid generator", async () => {
  async function* gen() {
    yield 1;
  }

  const g2 = new ExtendedGenerator(gen());

  for await (const v of g2) {
    expect(v).toBe(1);
  }
});

test("AugmentedIterator.toArray works without arguments", async () => {
  async function* gen() {
    yield 1;
    yield 2;
    yield 3;
  }
  const gen2 = new ExtendedGenerator(gen());

  await expect(gen2.toArray()).resolves.toEqual([1, 2, 3]);
});

test("AugmentedIterator.toArray does not restart the iteration", async () => {
  async function* gen() {
    yield 1;
    yield 2;
    yield 3;
  }
  const gen2 = new ExtendedGenerator(gen());

  await gen2.next();
  await expect(gen2.toArray()).resolves.toEqual([2, 3]);
});
