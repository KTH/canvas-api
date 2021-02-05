import { ExtendOptions } from "got";
import CanvasAPI from "./index";

let singleton: CanvasAPI | null = null;

export function init(apiUrl: string, apiToken: string, options: ExtendOptions) {
  singleton = new CanvasAPI(apiUrl, apiToken, options);
}

export default singleton;
