/* eslint-disable */
require("dotenv").config();
const canvasApiUrl = process.env.CANVAS_API_URL;
const canvasApiToken = process.env.CANVAS_API_TOKEN;
const { CanvasApi } = require("../dist/index");
const { readFile } = require("node:fs/promises");
const { resolve } = require("node:path");

async function start() {
  console.log("Performing a SIS Import");
  const canvas = new CanvasApi(canvasApiUrl, canvasApiToken);

  try {
    const b = await readFile(resolve(__dirname, "./test.csv"));
    // const bl = new Blob(b);
    const file = new File([b], "test.csv");
    const { json, text, headers } = await canvas.sisImport(file);
    // console.log(json);

    console.log(headers);
    console.log(text);
  } catch (err) {
    console.error("Something failed");
    console.error(err);
  }
}

start();
