import z from "zod";
import { trustedProxyListSchema } from "./lib/clientIp.js";

const envSchema = z
  .object({
    COOKIE_SECURE: z.enum(["true", "false"]).default("false"),
    COOKIE_DOMAIN: z.string().optional(),
    SIGNED_COOKIE_SECRET: z.string().min(32),
    REDIS_URL: z.url().optional(),
    UPSTASH_REDIS_REST_URL: z.url().startsWith("https://").optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z
      .string()
      .transform((val) => parseInt(val, 10))
      .default(3000),
    RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().min(1).default(60),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(120),
    RATE_LIMIT_TRUSTED_PROXIES: z
      .string()
      .default("")
      .transform((value) => (value.trim() ? value.split(",").map((entry) => entry.trim()) : []))
      .pipe(trustedProxyListSchema),
    RP_ID: z.string(),
    ORIGIN: z.url(),
  })
  .superRefine((env, ctx) => {
    const hasRest = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
    if (Boolean(env.UPSTASH_REDIS_REST_URL) !== Boolean(env.UPSTASH_REDIS_REST_TOKEN)) {
      ctx.addIssue({ code: "custom", message: "Both Upstash REST credentials are required" });
    }
    if (!env.REDIS_URL && !hasRest) {
      ctx.addIssue({ code: "custom", message: "Redis connection settings are required" });
    }
    if (process.env.CLOUDFLARE_WORKERS === "true" && !hasRest) {
      ctx.addIssue({ code: "custom", message: "Workers requires Upstash REST credentials" });
    }
  });

export const typedEnv = envSchema.parse(process.env);
