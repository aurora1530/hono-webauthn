import { readFile } from "node:fs/promises";
import z from "zod";

const relatedOriginsSchema = z.object({
  origins: z.array(z.url()),
});

export const relatedOrigins = relatedOriginsSchema.parse(
  JSON.parse(await readFile(new URL("../../../related_origins.json", import.meta.url), "utf-8")),
);
