import Canvas from '@kth/canvas-api'
import check from './check-env.js'

async function start () {
  check()

  console.log('Making a GET request to /accounts/1')
  const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  const { body } = await canvas.get('accounts/1')
  console.log('Showing response body...')
  console.log(body)
}

start()
