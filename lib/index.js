import got from 'got'
import queryString from 'query-string'
import augmentGenerator from './augmentGenerator.js'
import FormData from 'form-data'
import fs from 'fs'
import Joi from '@hapi/joi'

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
  const canvasGot = got.extend({
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    json: true
  })

  async function requestUrl (endpoint, method = 'GET', body = {}, options = {}) {
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

      return result
    } catch (err) {
      debug(`Error in requestUrl() ${err.name}`)
      throw removeToken(err)
    }
  }

  async function get (endpoint, queryParams = {}) {
    try {
      const result = await canvasGot({
        url: endpoint,
        baseUrl: apiUrl,
        method: 'GET',
        query: queryString.stringify(queryParams, { arrayFormat: 'bracket' })
      })

      return result
    } catch (err) {

      throw removeToken(err)
    }
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
    try {
      const query = queryString.stringify(queryParams, { arrayFormat: 'bracket' })
      const first = await canvasGot.get({
        query,
        url: endpoint,
        baseUrl: apiUrl
      })

      yield first.body
      let url = first.headers && first.headers.link && getNextUrl(first.headers.link)

      while (url) {
        const response = await canvasGot.get({ url })

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
