import { readFile } from "node:fs/promises";
import z from "zod";

const aaguidSchema = z.object({
  name: z.string(),
  icon_dark: z.url().optional(),
  icon_light: z.url().optional(),
});

const aaguidJsonSchema = z.record(z.string(), aaguidSchema);

type AAGUID = z.infer<typeof aaguidSchema>;

type AAGUIDJSON = z.infer<typeof aaguidJsonSchema>;

const aaguidData: AAGUIDJSON = await (async () => {
  const parsed = JSON.parse(await readFile(new URL('./aaguid.json', import.meta.url), 'utf-8'));
  return aaguidJsonSchema.parse(parsed);
})();

export const aaguidToNameAndIcon = (aaguid: string): AAGUID | undefined => {
  return aaguidData[aaguid];
}