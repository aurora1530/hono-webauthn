import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";
import { typedEnv } from "../../env.ts";

// Unified cookie policy (inlined; removed cookie-options.ts)
const isSecureCookie: boolean =
  typedEnv.COOKIE_SECURE === "true" || typedEnv.NODE_ENV === "production";
const signedCookiePrefix: "secure" | "host" | undefined = isSecureCookie ? "secure" : undefined;
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "Lax",
  secure: isSecureCookie,
  path: "/",
  domain: typedEnv.COOKIE_DOMAIN,
} as const;

const SIGNED_COOKIE_SECRET = typedEnv.SIGNED_COOKIE_SECRET;
if (!SIGNED_COOKIE_SECRET) {
  throw new Error("SIGNED_COOKIE_SECRET is not set");
}

const setCookieHelper = async (
  c: Context,
  name: string,
  value: string,
  options: CookieOptions = {},
) => {
  const base: CookieOptions = {
    ...options,
    ...baseCookieOptions,
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: baseCookieOptions.sameSite,
    path: baseCookieOptions.path,
    domain: baseCookieOptions.domain,
  };
  const finalOptions: CookieOptions & { prefix?: "secure" | "host" } = signedCookiePrefix
    ? { ...base, prefix: signedCookiePrefix }
    : base;
  await setSignedCookie(c, name, value, SIGNED_COOKIE_SECRET, finalOptions);
};

/**
 * return `false` for a specified cookie if the signature was tampered with or is invalid
 */
const getCookieHelper = async (c: Context, name: string): Promise<string | undefined | false> => {
  if (signedCookiePrefix) {
    return await getSignedCookie(c, SIGNED_COOKIE_SECRET, name, signedCookiePrefix);
  }
  return await getSignedCookie(c, SIGNED_COOKIE_SECRET, name);
};

const deleteCookieHelper = (c: Context, name: string, options: CookieOptions = {}) => {
  const base: CookieOptions = {
    ...options,
    ...baseCookieOptions,
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: baseCookieOptions.sameSite,
    path: baseCookieOptions.path,
    domain: baseCookieOptions.domain,
  };
  const finalOptions: CookieOptions & { prefix?: "secure" | "host" } = signedCookiePrefix
    ? { ...base, prefix: signedCookiePrefix }
    : base;
  deleteCookie(c, name, finalOptions);
};

export { setCookieHelper, getCookieHelper, deleteCookieHelper };
