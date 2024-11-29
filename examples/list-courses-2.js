/* eslint-disable */
/* eslint-disable */
require("dotenv").config();
const canvasApiUrl = process.env.CANVAS_API_URL;
const canvasApiToken = process.env.CANVAS_API_TOKEN;
const { CanvasApi } = require("@kth/canvas-api");

async function start() {
  const canvas = new CanvasApi(canvasApiUrl, canvasApiToken);

  const courses = canvas.listItems("accounts/1/courses");

  // Now `courses` is an iterator that goes through every course
  for await (const course of courses) {
    console.log(course.id, course.name);
  }
}

start();
