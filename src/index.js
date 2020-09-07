import got from 'got'
import queryString from 'query-string'
import augmentGenerator from './augment-generator.js'
import FormData from 'form-data'
import fs from 'fs'
import Joi from '@hapi/joi'

function getNextUrl (linkHeader) {
  const next = linkHeader.split(',').find(l => l.search(/rel="next"$/) !== -1)

  const url = next && next.match(/<(.*?)>/)
  return url && url[1]
}

export default function Canvas (apiUrl, apiKey, options = {}) {
  const canvasGot = got.extend({
    prefixUrl: apiUrl,
    responseType: 'json',
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  })

  async function requestUrl (endpoint, method, body = {}, options = {}) {
    if (!method) {
      throw new Error('Argument "method" is required')
    }

    if (method === 'GET') {
      throw new Error('You cannot perform GET requests with this method')
    }

    const result = await canvasGot({
      body,
      url: endpoint,
      method,
      ...options
    })

    return result
  }

  async function get (endpoint, queryParams = {}) {
    return canvasGot({
      url: endpoint,
      method: 'GET',
      query: queryString.stringify(queryParams, { arrayFormat: 'bracket' })
    })
  }

  async function * list (endpoint, queryParams = {}) {
    for await (const page of listPaginated(endpoint, queryParams)) {
      Joi.assert(page, Joi.array(), `The function ".list()" should be used with endpoints that return arrays. Use "get()" instead with the endpoint ${endpoint}.`)

      for (const element of page) {
        yield element
      }
    }
  }

  async function * listPaginated (endpoint, queryParams = {}) {
    const query = queryString.stringify(queryParams, { arrayFormat: 'bracket' })
    const first = await canvasGot.get({
      query,
      url: endpoint
    })

    yield first.body
    let url = first.headers && first.headers.link && getNextUrl(first.headers.link)

    while (url) {
      const response = await canvasGot.get({ url, prefixUrl: '' })

      yield response.body
      url = response.headers && response.headers.link && getNextUrl(response.headers.link)
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
        body: form
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
