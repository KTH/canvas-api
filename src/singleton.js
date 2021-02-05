import CanvasAPI from "./index";

let singleton = null;

export function init(apiUrl, apiToken, options) {
  singleton = new CanvasAPI(apiUrl, apiToken, options);
}

export default singleton;
