const rp = require('request-promise')
const defaultLogger = require('kth-console-log')
require('colors')
const fs = require('fs')

var log = defaultLogger

/*
This returns an object with all the exported functions,
but has to be called with apiKey and apiUrl.

example:
const CanvasApi = require('./canvasApi')
const canvasApi = new CanvasApi('http://my.canvas.api', 'my canvas key')
*/
class CanvasApi{
  constructor(_apiUrl, _apiKey) {
    this.apiUrl = _apiUrl
    this.apiKey = _apiKey
  }
  set logger(logger) {
    log.info('overriding logger for canvasApi')
    log = logger
  }
  get logger() {
    return log
  }

  get rootAccount(){
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
            .then(accounts => accounts.find(account => account.name === 'KTH Royal Institute of Technology' && account.workflow_state == 'active'))
            .then(account => account.id)
  }

  listAccounts () {
    return this.requestCanvas('accounts')
  }

  recursePages (url, out) {
    function _getPage (url) {
      console.log('get page'.yellow, url)
      return rp({
        transform: (body, response) => {
          return {body, headers: response.headers} },
        url,
        auth: {
          'bearer': this.apiKey
        },
        headers: {
          'content-type': 'application/json'
        }
      })
    }

    return _getPage(url)
      .then(({body, headers}) => {
        out.push(JSON.parse(body))

        const arrayOfRelHeaders = headers.link.split(',').map(rel => rel.split(';'))

        const nextPageHeader = arrayOfRelHeaders.filter(([urlTag, rel]) => /next/.test(rel))
        if (nextPageHeader && nextPageHeader.length && nextPageHeader[0].length) {
          const [[nextUrlTag]] = nextPageHeader
          return this.recursePages(nextUrlTag.slice(1, nextUrlTag.length - 1), out)
        } else {
          return out
        }
      })
  }

  listUsers () {
    const result = []
    log.info(`Listing users in canvas`)
    return this.rootAccount
      .then(accountId => this.recursePages(`${this.apiUrl}/accounts/${accountId}/users?per_page=100`, result))
      .then(users => [].concat.apply([], users)) // flatten array
  }

  createUser (user) {
    return this.rootAccount
      .then(accountId => {
        log.info(`Creating user ${user} in canvas`)
        return this.requestCanvas(`accounts/${accountId}/users`, 'POST', user) })
  }

  updateUser (user, id) {
    log.info(`Updating user ${user} with id ${id} in canvas`)
    return this.requestCanvas(`users/${id}`, 'PUT', user)
  }

  createCourse (course, accountId) {
    log.info(`Creating course ${JSON.stringify(course, null, 4)} with account ${accountId} in canvas`)
    return this.requestCanvas(`accounts/${accountId}/courses`, 'POST', course)
  }

  listCourses () {
    const result = []
    log.info(`Listing courses in canvas`)

    return this.rootAccount
      .then(accountId => this.recursePages(`${this.apiUrl}/accounts/${accountId}/courses?per_page=100`, result))
      .then(() => [].concat.apply([], result)) // flatten array
  }

  listSubaccounts (parentAccountId) {
    const result = []
    log.info(`Listing subaccounts in canvas`)

    return this.rootAccount
      .then(accountId => this.recursePages(`${this.apiUrl}/accounts/${parentAccountId}/sub_accounts?per_page=100`, result))
      .then(() => [].concat.apply([], result)) // flatten array
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
          return Promise.reject(`Couldn't return exactly one user, since the query returned ${foundUsers.length} users`)
        }
      })
  }

  enrollUser (course, user, type) {
    log.info(`Enrolling user.id ${user.id} of type ${type} to course.id ${course.id} in canvas`)
    const body = {enrollment: {'user_id': user.id, type, 'notify': true}}
    return this.requestCanvas(`courses/${course.id}/enrollments `, 'POST', body)
  }

  getUser (kth_id) {
    log.info(`Getting user with kth_id ${kth_id} in canvas`)
    return this.requestCanvas(`users/sis_user_id:${kth_id}`)
  }

  getCourse (unique_id) {
    log.info(`Getting course with unique_id ${unique_id} in canvas`)
    return this.requestCanvas(`courses/sis_course_id:${unique_id}`)
  }

  getEnrollments (courseId) {
    log.info(`Getting enrollments for course with unique_id ${courseId} in canvas`)

    return this.requestCanvas(`courses/${courseId}/enrollments`)
  }

  getSisStatus(sisImportId) {
    return this.getRootAccount()
    .then(accountId =>this.requestCanvas(`accounts/${accountId}/sis_imports/${sisImportId}`))
  }

  pollUntilSisComplete(sisImportId, wait=100){
    return new Promise((resolve, reject)=>{
      this.getSisStatus(sisImportId)
      .then(result=>{
        log.info('progress:', result.progress)
        if(result.progress === 100){
          // csv complete
          resolve(result)
        }else{
          log.info(`not yet complete, try again in ${wait/1000} seconds`)
          // Not complete, wait and try again
          setTimeout(()=>{
            return this.pollUntilSisComplete(sisImportId, wait*2)
            .then(result => resolve(result))
          },wait)
        }
      })
    })
  }

  sendCsvFile (filename, json=false,account=1, options={}) {
    const {batchMode, batchTerm} = options
    log.info('Ready to send CSV file: ' + filename, batchMode, batchTerm)
    var formData = {
      attachment: [
        fs.createReadStream(filename)
      ]
    }
    const url = `${this.apiUrl}/accounts/${account}/sis_imports${batchMode?'?batch_mode=1':''}${batchTerm?'&batch_mode_term_id='+batchTerm:''}`
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
    })
  }
}
module.exports = CanvasApi
