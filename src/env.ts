import z from "zod";

const envSchema = z.object({
  COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
  COOKIE_DOMAIN: z.string().optional(),
  SIGNED_COOKIE_SECRET: z.string().min(32),
  REDIS_URL: z.url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default(3000),
  RP_ID: z.string().default("localhost"),
  ORIGIN: z.string().default("http://localhost:3000"),
});

export const typedEnv = envSchema.parse(process.env);
