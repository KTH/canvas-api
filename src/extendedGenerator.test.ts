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

describe("lazy behavior (does not call generator if not needed)", () => {
  test("with simple `take(0)`", async () => {
    async function* gen() {
      throw new Error();
    }

    const gen2 = new ExtendedGenerator(gen());

    expect(await gen2.take(0).toArray()).toEqual([]);
  });

  test("with filter and take", async () => {
    async function* gen() {
      throw new Error();
    }

    const gen2 = new ExtendedGenerator(gen());

    expect(
      await gen2
        .filter((_) => true)
        .take(0)
        .toArray()
    ).toEqual([]);
  });
});
