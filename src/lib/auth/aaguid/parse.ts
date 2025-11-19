import { readFile } from "node:fs/promises";
import z from "zod";

const passkeyMetadataSchema = z.object({
  name: z.string(),
  icon_dark: z.url().optional(),
  icon_light: z.url().optional(),
});

export const passkeyMetadataJsonSchema = z.record(z.string(), passkeyMetadataSchema);

type PasskeyMetadata = z.infer<typeof passkeyMetadataSchema>;

type PasskeyMetadataJson = z.infer<typeof passkeyMetadataJsonSchema>;

const aaguidData: PasskeyMetadataJson = await (async () => {
  const parsed = JSON.parse(await readFile(new URL('./aaguid.json', import.meta.url), 'utf-8'));
  return passkeyMetadataJsonSchema.parse(parsed);
})();

export const aaguidToNameAndIcon = (aaguid: string): PasskeyMetadata | undefined => {
  return aaguidData[aaguid];
}