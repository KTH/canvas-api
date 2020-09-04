import Canvas from '@kth/canvas-api'
import ora from 'ora'
import check from './check-env.js'

async function start () {
  check()
  console.log('Making paginated GET requests to /accounts/1/courses')
  console.log('Stop with Ctrl+C')
  const limit = 300
  const canvas = Canvas(process.env.CANVAS_API_URL, process.env.CANVAS_API_TOKEN)

  const spinner = ora(`Getting courses... 0/${limit}`).start()
  try {
    let count = 0
    for await (const course of canvas.list('accounts/1/courses')) {
      count++
      if (count >= limit) {
        break
      }
      spinner.text = `Getting courses... ${count}/${limit}. ${course.name}`
    }
    spinner.stop()
    console.log('List through 300 courses complete')
  } catch (err) {
    spinner.stopAndPersist()
    console.error(err)
  }
}

start()
