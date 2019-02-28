const rp = require('request-promise')
const defaultLogger = require('kth-console-log')
const fs = require('fs')

const EventEmitter = require('events')

var log = defaultLogger

function flatten (arr) {
  return [].concat.apply([], arr)
}

/*
This returns an object with all the exported functions,
but has to be called with apiKey and apiUrl.

example:
const CanvasApi = require('./canvasApi')
const canvasApi = new CanvasApi('http://my.canvas.api', 'my canvas key')
*/
class CanvasApi {
  constructor (_apiUrl, _apiKey) {
    this.apiUrl = _apiUrl
    this.apiKey = _apiKey
    this.eventEmitter = new EventEmitter()

    this.listCourses = () => {
      const result = []
      log.info(`Listing courses in canvas`)

      return this.rootAccount
        .then(accountId => this.recursePages(`${this.apiUrl}/accounts/${accountId}/courses?per_page=100`, result))
    }

    this.listSubaccounts = parentAccountId => {
      const result = []
      log.info(`Listing subaccounts in canvas`)

      return this.rootAccount
        .then(accountId => this.recursePages(`${this.apiUrl}/accounts/${parentAccountId}/sub_accounts?per_page=100`, result))
    }
  }
  set logger (logger) {
    log.info('overriding logger for canvasApi')
    log = logger
  }
  get logger () {
    return log
  }

  get rootAccount () {
    return this.getRootAccount()
  }

  requestCanvas (url, method = 'GET', data) {
    return this.requestUrl(url, method, data).then(result => {
      if (result.errors) {
        return Promise.reject(result.errors)
      } else {
        return Promise.resolve(result)
      }
    })
  }

  requestUrl (subUrl, method = 'GET', json) {
    const url = `${this.apiUrl}/${subUrl}`

    log.info(`Requesting url ${url}`)

    return rp({
      url,
      auth: {
        'bearer': this.apiKey
      },
      resolveWithFullResponse: true,
      method,
      json,
      headers: {
        'content-type': 'application/json'
      }

    })
      .then(res => json ? res.body : JSON.parse(res.body))
      .then(body => {
        this.eventEmitter.emit('canvasResponse', body)
        return body
      })
      // dont log entire error since that includes the access token
      .catch(e => {
        // Don't include everything in the error, since the request object
        // contain the access token. And we do not wan´t to log that.
        const strippedError = new Error(e.message)
        strippedError.statusCode = e.statusCode
        strippedError.statusMessage = e.statusMessage
        throw strippedError
      })
  }

  getRootAccount () {
    return this.listAccounts()
      .then(accounts => accounts.find(account => account.name === 'KTH Royal Institute of Technology' && account.workflow_state === 'active'))
      .then(account => account.id)
  }

  listAccounts () {
    return this.requestCanvas('accounts')
  }

  async get (subUrl, cb) {
    const result = []
    await this.recursePages(`${this.apiUrl}/${subUrl}`, result, cb)
    return result
  }

  async recursePages (url, out = [], cb = null) {
    log.info('get page', url)
    try {
      const { body, headers } = await rp({
        transform: (body, { headers }) => {
          return {
            body,
            headers
          }
        },
        url,
        auth: {
          'bearer': this.apiKey
        },
        headers: {
          'content-type': 'application/json'
        }
      })

      const bodyParsed = JSON.parse(body)

      if (cb) {
        log.info('about to call callback for this page...')
        await cb(bodyParsed)
        log.info('after calling callback')
      }

      if (Array.isArray(bodyParsed)) {
        out.push(...bodyParsed)
      } else {
        out.push(bodyParsed)
      }

      if (!headers.link) {
        return flatten(out)
      }
      const arrayOfRelHeaders = headers.link.split(',').map(rel => rel.split(';'))

      const nextPageHeader = arrayOfRelHeaders.filter(([urlTag, rel]) => /next/.test(rel))
      if (nextPageHeader && nextPageHeader.length && nextPageHeader[0].length) {
        const [[nextUrlTag]] = nextPageHeader
        return await this.recursePages(nextUrlTag.slice(1, nextUrlTag.length - 1), out, cb)
      } else {
        return flatten(out)
      }
    } catch (e) {
      log.info('Stripping the Exception to only include the message, no headers or such.')
      const strippedError = new Error(e.message)
      strippedError.stack = e.stack
      strippedError.statusCode = e.statusCode
      strippedError.statusMessage = e.statusMessage
      throw strippedError
    }
  }

  listUsers () {
    const result = []
    log.info(`Listing users in canvas`)
    return this.rootAccount
      .then(accountId => this.recursePages(`${this.apiUrl}/accounts/${accountId}/users?per_page=100`, result))
  }

  createUser (user) {
    return this.rootAccount
      .then(accountId => {
        log.info(`Creating user ${JSON.stringify(user)} in canvas`)
        return this.requestCanvas(`accounts/${accountId}/users`, 'POST', user)
      })
  }

  updateUser (user, id) {
    log.info(`Updating user ${JSON.stringify(user)} with id ${id} in canvas`)
    return this.requestCanvas(`users/${id}`, 'PUT', user)
  }

  createCourse (course, accountId) {
    log.info(`Creating course ${JSON.stringify(course, null, 4)} with account ${accountId} in canvas`)
    return this.requestCanvas(`accounts/${accountId}/courses`, 'POST', course)
  }

  createDefaultSection (course) {
    log.info(`Creating section ${JSON.stringify(course, null, 4)} in canvas`)
    const courseSection = {
      course_section: {
        name: `Section for ${course.name}`,
        sis_course_id: course.sis_course_id,
        sis_section_id: course.sis_course_id
      } }
    return this.requestCanvas(`courses/${course.id}/sections`, 'POST', courseSection)
  }

  /**
  usage example:

  canvasApi.findCourse('ML1318HT161')
    .then(result => console.log('course found', result))
    .catch(e => { if (e.statusCode === 404) {
      // not found
      console.log('course not found')
    } else {
      // something else went wrong
    } })
  */
  findCourse (sisCourseId) {
    log.info(`Finding course with sisCourseId ${sisCourseId} in canvas`)
    return this.requestCanvas(`courses/sis_course_id:${sisCourseId}`)
  }

  findUser (userName) {
    log.info(`Finding user with userName ${userName} in canvas`)
    return this.requestCanvas(`search/recipients?search=${userName}`)
      .then(foundUsers => {
        if (foundUsers.length === 1) {
          return foundUsers[0]
        } else {
          return Error(`Couldn't return exactly one user, since the query returned ${foundUsers.length} users`)
        }
      })
  }

  enrollUser (course, user, type) {
    log.info(`Enrolling user.id ${user.id} of type ${type} to course.id ${course.id} in canvas`)
    const body = { enrollment: { 'user_id': user.id, type, 'notify': true } }
    return this.requestCanvas(`courses/${course.id}/enrollments `, 'POST', body)
  }

  getUser (sisUserId) {
    log.info(`Getting user with sisUserId ${sisUserId} in canvas`)
    return this.requestCanvas(`users/sis_user_id:${sisUserId}`)
  }

  getCourse (courseId) {
    log.info(`Getting course with courseId ${courseId} in canvas`)
    return this.requestCanvas(`courses/sis_course_id:${courseId}`)
  }

  getEnrollments (courseId) {
    log.info(`Getting enrollments for course with unique_id ${courseId} in canvas`)

    return this.recursePages(`${this.apiUrl}/courses/${courseId}/enrollments?per_page=100`)
  }

  getSisStatus (sisImportId) {
    return this.getRootAccount()
      .then(accountId => this.requestCanvas(`accounts/${accountId}/sis_imports/${sisImportId}`))
  }

  pollUntilSisComplete (sisImportId, wait = 100) {
    return new Promise((resolve, reject) => {
      this.getSisStatus(sisImportId)
        .then(result => {
          log.info('progress:', result.progress)
          if (result.progress === 100) {
          // csv complete
            resolve(result)
          } else {
            log.info(`not yet complete, try again in ${wait / 1000} seconds`)
            // Not complete, wait and try again
            setTimeout(() => {
              return this.pollUntilSisComplete(sisImportId, wait * 2)
                .then(result => resolve(result))
            }, wait)
          }
        })
    })
  }

  sendCsvFile (filename, json = false, account = 1, options = {}) {
    const { batchMode, batchTerm } = options
    log.info(`Ready to send CSV file: ${filename}, batchMode: ${batchMode}, batchTerm: ${batchTerm}`)
    var formData = {
      attachment: [
        fs.createReadStream(filename)
      ]
    }

    const url = `${this.apiUrl}/accounts/${account}/sis_imports${batchMode ? '?batch_mode=1' : ''}${batchTerm ? '&batch_mode_term_id=' + batchTerm : ''}`
    log.info('url', url)

    return rp({
      url,
      auth: {
        'bearer': this.apiKey
      },
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data'
      },
      formData,
      json
    }).catch(e => {
      const strippedError = new Error(e.message)
      strippedError.statusCode = e.statusCode
      strippedError.statusMessage = e.statusMessage
      throw strippedError
    })
  }
  /**
   * Stores custom data on a user in Canvas
   * @param {object} customData - An Object containing an ns property and a data property with a subscoped value object.
   * @param {string} id - The Canvas ID for the affected user.
   */
  storeCustomData (customData, id) {
    log.info(`Storing custom data ${JSON.stringify(customData)} on user with id ${id} in canvas`)
    return this.requestCanvas(`users/${id}/custom_data`, 'PUT', customData)
  }

}
module.exports = CanvasApi
