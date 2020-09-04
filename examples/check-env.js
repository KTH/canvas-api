export default function check () {
  if (!process.env.CANVAS_API_URL) {
    console.error(
      'Required env var CANVAS_API_URL not set\n' +
      'HINT: if you want to use an \'.env\' file, execute \'node -r dotenv/config\' «filename»'
    )

    process.exit(1)
  }

  if (!process.env.CANVAS_API_TOKEN) {
    console.error(
      'Required env var CANVAS_API_URL not set\n' +
      'HINT: if you want to use an \'.env\' file, execute \'node -r dotenv/config\' «filename»'
    )

    process.exit(1)
  }

  console.log(
    'Checking environmental variables...\n' +
    `- CANVAS_API_URL: ${process.env.CANVAS_API_URL}\n` +
    '- CANVAS_API_TOKEN: <not showing>'
  )
  console.log()
}
