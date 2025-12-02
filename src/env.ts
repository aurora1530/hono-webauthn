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
  RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(120),
  RP_ID: z.string(),
  ORIGIN: z.string(),
  RELATED_ORIGINS: z.string().optional(),
});

export const typedEnv = envSchema.parse(process.env);
