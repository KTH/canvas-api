/* eslint-disable */
/* eslint-disable */
require("dotenv").config();
const canvasApiUrl = process.env.CANVAS_API_URL;
const canvasApiToken = process.env.CANVAS_API_TOKEN;
const { CanvasApi } = require("@kth/canvas-api");

async function start() {
  const canvas = new CanvasApi(canvasApiUrl, canvasApiToken);

  const pages = canvas.listPages("accounts/1/courses");

  // Now `pages` is an iterator that goes through every page
  for await (const coursesResponse of pages) {
    // `courses` is the Response object that contains a list of courses
    const courses = coursesResponse.body;

    for (const course of courses) {
      console.log(course.id, course.name);
    }
  }
}

start();
