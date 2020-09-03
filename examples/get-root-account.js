import './env.js'
import Canvas from '@kth/canvas-api'

async function start () {
  console.log(
    'Checking environmental variables...\n' +
    `- CANVAS_API_URL: ${process.env.CANVAS_API_URL}\n` +
    `- CANVAS_API_TOKEN: ${process.env.CANVAS_API_TOKEN ? '<not showing>' : 'not set'}`
  )
  console.log()
  console.log('Making a GET request to /accounts/1')
  const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  const { body } = await canvas.get('accounts/1')
  console.log('Showing response body...')
  console.log(body)
}

start()
