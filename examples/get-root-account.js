/* eslint-disable */
require("dotenv").config();
const canvasApiUrl = process.env.CANVAS_API_URL;
const canvasApiToken = process.env.CANVAS_API_TOKEN;
const { CanvasApi } = require("@kth/canvas-api");

async function start() {
  console.log("Making a GET request to /accounts/1");
  const canvas = new CanvasApi(canvasApiUrl, canvasApiToken);

  const { body } = await canvas.get("accounts/1");
  console.log(body);
}

start();
