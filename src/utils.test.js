import test from "ava";
import { augmentGenerator } from "./utils.js";

test("augmentGenerator returns a valid generator", async (t) => {
  async function* gen() {
    yield 1;
  }

  for await (const v of augmentGenerator(gen())) {
    t.is(v, 1);
  }
});

test("AugmentedIterator.toArray works without arguments", async (t) => {
  async function* gen() {
    yield 1;
    yield 2;
    yield 3;
  }

  t.deepEqual(await augmentGenerator(gen()).toArray(), [1, 2, 3]);
});

test("AugmentedIterator.toArray does not restart the iteration", async (t) => {
  async function* gen() {
    yield 1;
    yield 2;
    yield 3;
  }
  const gen2 = augmentGenerator(gen());
  await gen2.next();

  t.deepEqual(await gen2.toArray(), [2, 3]);
});
