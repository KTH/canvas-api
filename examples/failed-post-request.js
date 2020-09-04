import Canvas from '@kth/canvas-api'
import check from './check-env.js'

async function start () {
  check()
  console.log('Making a POST request to /courses/1/enrollments (should fail)')
  const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  try {
    await canvas.requestUrl('courses/1/enrollments', 'POST')
  } catch (err) {
    console.log('Displaying `err` object')
    console.log(`- statusCode    ${err.response.statusCode}`)
    console.log(`- statusMessage ${err.response.statusMessage}`)
    console.log(`- body.message  ${err.response.body.message}`)
  }
}

start()
