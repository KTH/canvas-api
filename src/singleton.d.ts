import { ExtendOptions } from "got";
import CanvasAPI from "./index";
declare let singleton: CanvasAPI | null;
export declare function init(
  apiUrl: string,
  apiToken: string,
  options: ExtendOptions
): void;
export default singleton;
