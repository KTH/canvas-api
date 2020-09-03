import got from 'got'
import queryString from 'query-string'
import augmentGenerator from './lib/augmentGenerator.js'
import FormData from 'form-data'
import fs from 'fs'
import Joi from '@hapi/joi'
import debuglib from 'debug'
const debug = debuglib.debug('canvas-api')

function removeToken (err) {
  delete err.gotOptions
  return err
}

function getNextUrl (linkHeader) {
  const next = linkHeader.split(',').find(l => l.search(/rel="next"$/) !== -1)

  const url = next && next.match(/<(.*?)>/)
  return url && url[1]
}

export default function Canvas (apiUrl, apiKey, options = {}) {
  if (options.log) {
    process.emitWarning('The "log" option is deprecated. Use DEBUG=canvas-api environment variable to enable debugging (more detailed)', 'DeprecationWarning')
  }

  const log = options.log || (() => {})

  const canvasGot = got.extend({
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    json: true
  })

  async function requestUrl (endpoint, method = 'GET', body = {}, options = {}) {
    log(`Request ${method} ${endpoint}`)
    debug(`requestUrl() ${method} ${endpoint}`)

    if (method === 'GET') {
      process.emitWarning('requestUrl() with "GET" methods is deprecated. Use get(), list() or listPaginated() instead.', 'DeprecationWarning')
    }

    try {
      const result = await canvasGot({
        baseUrl: apiUrl,
        body: body,
        url: endpoint,
        method,
        ...options
      })

      debug(`Successful request ${method} ${endpoint} - returning`)
      log(`Response from ${method} ${endpoint}`)
      return result
    } catch (err) {
      debug(`Error in requestUrl() ${err.name}`)
      throw removeToken(err)
    }
  }

  async function get (endpoint, queryParams = {}) {
    debug(`get() ${endpoint}`)
    try {
      const result = await canvasGot({
        url: endpoint,
        baseUrl: apiUrl,
        method: 'GET',
        query: queryString.stringify(queryParams, { arrayFormat: 'bracket' })
      })
      debug(`Response from get() ${endpoint}`)
      return result
    } catch (err) {
      debug(`Error in get() ${err.name}`)
      throw removeToken(err)
    }
  }

  async function * list (endpoint, queryParams = {}) {
    debug(`list() ${endpoint}`)

    for await (const page of listPaginated(endpoint, queryParams)) {
      Joi.assert(page, Joi.array(), `The function ".list()" should be used with endpoints that return arrays. Use "get()" instead with the endpoint ${endpoint}.`)

      log(`list() ${endpoint}. Traversing a page...`)
      debug('Traversing a page')

      for (const element of page) {
        yield element
      }
    }
  }

  async function * listPaginated (endpoint, queryParams = {}) {
    debug(`listPaginated() ${endpoint}`)
    try {
      const query = queryString.stringify(queryParams, { arrayFormat: 'bracket' })
      const first = await canvasGot.get({
        query,
        url: endpoint,
        baseUrl: apiUrl
      })

      debug(`listPaginated() ${endpoint} - Yielding first page`)

      yield first.body
      let url = first.headers && first.headers.link && getNextUrl(first.headers.link)

      while (url) {
        log(`Request GET ${url}`)
        debug(`listPaginated() ${endpoint} - Requesting ${url}`)

        const response = await canvasGot.get({ url })

        log(`Response from GET ${url}`)
        yield response.body
        url = response.headers && response.headers.link && getNextUrl(response.headers.link)
      }
    } catch (err) {
      throw removeToken(err)
    }
  }

  async function sendSis (endpoint, attachment, body = {}) {
    const form = new FormData()

    for (const key in body) {
      form.append(key, body[key])
    }

    form.append('attachment', fs.createReadStream(attachment))

    return canvasGot
      .post({
        url: endpoint,
        baseUrl: apiUrl,
        json: false,
        body: form
      })
      .then(response => {
        response.body = JSON.parse(response.body)
        return response
      })
  }

  return {
    requestUrl,
    get,
    list: augmentGenerator(list),
    listPaginated: augmentGenerator(listPaginated),
    sendSis
  }
}
