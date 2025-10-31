import { readFile } from "node:fs/promises";
import type { AAGUID, AAGUIDJSON } from "./type.js";

const aaguidData: AAGUIDJSON = await (async () => {
  return JSON.parse(await readFile(new URL('./aaguid.json', import.meta.url), 'utf-8')) as AAGUIDJSON;
})();

export const aaguidToNameAndIcon = (aaguid: string): AAGUID | undefined => {
  return aaguidData[aaguid];
}