const proxyquire = require('proxyquire').noCallThru()

const test = require('ava')
const Canvas = require('../index')

test('Token is correctly stripped', async t => {
  t.plan(1)
  const canvas = Canvas('https://kth.test.instructure.com/api/v1', 'My token')

  try {
    await canvas.requestUrl('/accounts')
  } catch (err) {
    const error = JSON.stringify(err)
    t.notRegex(error, /My token/)
  }
})

test('URLs are correctly "resolved"', async t => {
  const urls = [
    { base: 'http://example.com', end: '/index', expected: 'http://example.com/index' },
    { base: 'http://example.com', end: 'index', expected: 'http://example.com/index' },
    { base: 'http://example.com/', end: '/index', expected: 'http://example.com/index' },
    { base: 'http://example.com/', end: 'index', expected: 'http://example.com/index' },

    { base: 'http://example.com/api/v1', end: '/courses/1', expected: 'http://example.com/api/v1/courses/1' },
    { base: 'http://example.com/api/v1', end: 'courses/1', expected: 'http://example.com/api/v1/courses/1' },
    { base: 'http://example.com/api/v1/', end: '/courses/1', expected: 'http://example.com/api/v1/courses/1' },
    { base: 'http://example.com/api/v1/', end: 'courses/1', expected: 'http://example.com/api/v1/courses/1' }
  ]

  for (const { base, end, expected } of urls) {
    let spy
    const SpecialCanvas = proxyquire('../index', {
      'request-promise': function (obj) {
        spy = obj.url
        return []
      }
    })

    const canvas = SpecialCanvas(base)
    canvas.get(end)

    t.is(spy, expected)
  }
})

test('List returns a correct iterable', async t => {
  const SpecialCanvas = proxyquire('../index', {
    'request-promise': function ({ url }) {
      if (url === 'http://example.com/something') {
        return {
          body: [1, 2, 3],
          headers: {
            link: '<http://example.com/something_else>; rel="next", <irrelevant>; rel="first"'
          }
        }
      } else if (url === 'http://example.com/something_else') {
        return {
          body: [4, 5]
        }
      }
    }
  })

  const canvas = SpecialCanvas('http://example.com')
  const result = []

  for await (const e of canvas.list('/something')) {
    result.push(e)
  }

  t.deepEqual(result, [1, 2, 3, 4, 5])
})

test('List returns an Augmented iterable', async t => {
  const SpecialCanvas = proxyquire('../index', {
    'request-promise': function ({ url }) {
      if (url === 'http://example.com/something') {
        return {
          body: [1, 2, 3],
          headers: {
            link: '<http://example.com/something_else>; rel="next", <irrelevant>; rel="first"'
          }
        }
      } else if (url === 'http://example.com/something_else') {
        return {
          body: [4, 5]
        }
      }
    }
  })

  const canvas = SpecialCanvas('http://example.com')
  const result = await canvas.list('/something').take()

  t.deepEqual(result, [1, 2, 3, 4, 5])
})

test('List ignores non-"rel=next" link headers', async t => {
  const SpecialCanvas = proxyquire('../index', {
    'request-promise': function ({ url }) {
      if (url === 'http://example.com/something') {
        return {
          body: [1],
          headers: {
            link: '<http://dont-call.com>; rel="last", <http://ignore-this.se>; rel="prev", <http://nope.com>; rel="first"'
          }
        }
      } else {
        t.fail(`The url: "${url}" was requested and should not be!`)
      }
    }
  })

  const canvas = SpecialCanvas('http://example.com')
  const result = []

  for await (const e of canvas.list('/something')) {
    result.push(e)
  }
  t.deepEqual(result, [1])
})

test('List can handle pagination urls with query strings', async t => {
  const SpecialCanvas = proxyquire('../index', {
    'request-promise': function ({ url, qs }) {
      if (url === 'http://example.com/something') {
        return {
          body: [1, 2, 3],
          headers: {
            link: '<http://example.com/something_else?query=string>; rel="next", <irrelevant>; rel="first"'
          }
        }
      } else if (url === 'http://example.com/something_else?query=string' && !qs) {
        return {
          body: [4, 5]
        }
      }
    }
  })

  const canvas = SpecialCanvas('http://example.com')
  const result = []

  for await (const e of canvas.list('/something')) {
    result.push(e)
  }

  t.deepEqual(result, [1, 2, 3, 4, 5])
})
