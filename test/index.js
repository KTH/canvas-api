import test from 'ava'
import createTestServer from 'create-test-server'
import fs from 'fs'
import tempy from 'tempy'
import Canvas from '@kth/canvas-api'

test('Token is correctly stripped', async t => {
  t.plan(1)
  const canvas = Canvas('https://kth.test.instructure.com/api/v1', 'My token')

  try {
    await canvas.get('accounts')
  } catch (err) {
    const error = JSON.stringify(err)
    t.notRegex(error, /My token/)
  }
})

test('URLs are correctly "resolved"', async t => {
  const server = await createTestServer()
  server.get('/index', { foo: 'bar' })
  server.get('/api/v1/courses/1', { foo: 'bar' })

  const urls = [
    { base: server.url, end: 'index' },
    { base: `${server.url}/`, end: 'index' },
    { base: `${server.url}/api/v1`, end: 'courses/1' },
    { base: `${server.url}/api/v1/`, end: 'courses/1' }
  ]

  for (const { base, end } of urls) {
    const canvas = Canvas(base, '')
    const result = await canvas.get(end)
    t.is(result.body.foo, 'bar')
  }
})

test('List returns a correct iterable', async t => {
  const server = await createTestServer()

  server.get('/something', (req, res) => {
    res.set('Link', `<${server.url}/something_else>; rel="next", <irrelevant>; rel="first"`)
    res.send([1, 2, 3])
  })
  server.get('/something_else', [4, 5])

  const canvas = Canvas(server.url, '')
  const result = []

  for await (const e of canvas.list('something')) {
    result.push(e)
  }

  t.deepEqual(result, [1, 2, 3, 4, 5])
})

test('List returns an Augmented iterable', async t => {
  const server = await createTestServer()

  server.get('/something', (req, res) => {
    res.set('Link', `<${server.url}/something_else>; rel="next", <irrelevant>; rel="first"`)
    res.send([1, 2, 3])
  })
  server.get('/something_else', [4, 5])

  const canvas = Canvas(server.url, '')
  const result = await canvas.list('something').toArray()

  t.deepEqual(result, [1, 2, 3, 4, 5])
})

test('List ignores non-"rel=next" link headers', async t => {
  const server = await createTestServer()

  server.get('/something', (req, res) => {
    res.set('Link', '<http://dont-call.com>; rel="last", <http://ignore-this.se>; rel="prev", <http://nope.com>; rel="first"')
    res.send([1])
  })

  const canvas = Canvas(server.url, '')
  const result = []

  for await (const e of canvas.list('something')) {
    result.push(e)
  }
  t.deepEqual(result, [1])
})

test('List can handle pagination urls with query strings', async t => {
  const server = await createTestServer()

  server.get('/something', (req, res) => {
    res.set('Link', `<${server.url}/something_else?query=string>; rel="next"`)
    res.send([1])
  })
  server.get('/something_else', (req, res) => {
    if (req.originalUrl === '/something_else?query=string') {
      res.send(['correct'])
    } else {
      res.send(['nope'])
    }
  })

  const canvas = Canvas(server.url, '')

  const it = canvas.list('something?with=query_string')
  await it.next()
  const result = await it.next()

  t.is(result.value, 'correct')
})

test('sendSis fails when file is missing', async t => {
  const canvas = Canvas('https://example.instructure.com', 'Token')
  await t.throwsAsync(() => canvas.sendSis('/some-endpoint', 'non-existing-file'))
})

test('sendSis returns a parsed JSON object upon success', async t => {
  const server = await createTestServer()

  server.post('/file', (req, res) => {
    res.send({ key: 'value' })
  })

  const canvas = Canvas(server.url, '')
  const tmp = tempy.file()
  fs.writeFileSync(tmp, 'hello world')
  const response = await canvas.sendSis('file', tmp)
  t.deepEqual(response.body, { key: 'value' })
})

test('List throws a descriptive error if the endpoint response is not an array', async t => {
  const server = await createTestServer()

  server.get('/not-a-list', (req, res) => {
    res.send({ x: 1 })
  })

  const canvas = Canvas(server.url, '')
  const it = canvas.list('not-a-list')

  await t.throwsAsync(() => it.next(), { name: 'ValidationError' })
})
