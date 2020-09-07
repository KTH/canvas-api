import test from 'ava'
import augmentGenerator from './augment-generator.js'

test('augmentGenerator does not mutate the original generator', t => {
  async function * gen () {
    yield 1
  }

  augmentGenerator(gen())

  t.falsy(gen().toArray)
})

test('augmentGenerator returns a valid generator', async t => {
  async function * gen () {
    yield 1
  }

  const g2 = augmentGenerator(gen)

  for await (const v of g2()) {
    t.is(v, 1)
  }
})

test('AugmentedIterator.toArray works without arguments', async t => {
  const gen = augmentGenerator(async function * () {
    yield 1
    yield 2
    yield 3
  })

  t.deepEqual(await gen().toArray(), [1, 2, 3])
})

test('AugmentedIterator.toArray does not restart the iteration', async t => {
  const gen = augmentGenerator(async function * () {
    yield 1
    yield 2
    yield 3
  })

  const it = gen()

  await it.next()
  t.deepEqual(await it.toArray(), [2, 3])
})
