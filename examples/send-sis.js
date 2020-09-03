import './env.js'
import Canvas from '@kth/canvas-api'
import tempy from 'tempy'
import fs from 'fs'

async function start () {
  console.log(
    'Checking environmental variables...\n' +
    `- CANVAS_API_URL: ${process.env.CANVAS_API_URL}\n` +
    `- CANVAS_API_TOKEN: ${process.env.CANVAS_API_TOKEN ? '<not showing>' : 'not set'}`
  )
  console.log()
  console.log('Making a POST request to /accounts/1/sis_imports with a file')
  const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  try {
    const tmp = tempy.file()
    fs.writeFileSync(tmp, 'hello world')
    const response = await canvas.sendSis('accounts/1/sis_imports', tmp)
    console.log('Showing response body...')
    console.log(response.body)
  } catch (err) {
    console.log(err)
  }
}

start()
