import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";

const SIGNED_COOKIE_SECRET = process.env.SIGNED_COOKIE_SECRET
if (!SIGNED_COOKIE_SECRET) {
  throw new Error("SIGNED_COOKIE_SECRET is not set");
}

const setCookieHelper = async (c: Context, name: string, value: string, options: CookieOptions = {}) => {
  await setSignedCookie(c, name, value, SIGNED_COOKIE_SECRET, {
    ...options,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    prefix: 'secure',
  });
}

/**
 * return `false` for a specified cookie if the signature was tampered with or is invalid
 */
const getCookieHelper = async (c: Context, name: string): Promise<string | undefined | false> => {
  return await getSignedCookie(c, SIGNED_COOKIE_SECRET, name, 'secure');
}

const deleteCookieHelper = (c: Context, name: string, options: CookieOptions = {}) => {
  deleteCookie(c, name, {
    ...options,
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    prefix: 'secure',
  });
}

export { setCookieHelper, getCookieHelper, deleteCookieHelper };