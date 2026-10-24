import type { Context } from "hono";
import { deleteCookieHelper, getCookieHelper, setCookieHelper } from "./auth/cookieHelper.js";

interface ServerMessageHandler {
  setMessage(c: Context, message: string): Promise<void>;
  getMessage(c: Context): Promise<string | undefined>;
}

const TTL_SEC = 10 * 60 * 1000; // 10 minutes
const SERVER_MESSAGE_COOKIE_NAME = "server_message";

/**
 * サーバーからのメッセージをクッキーでやり取りするハンドラー。
 * Context等でやり取りすると、リダイレクト時に情報が失われるため、クッキーを使用する。
 * サーバーからの一時的な通知メッセージなどに使用するため、クッキーとして渡しても問題ない。
 */
const serverMessageHandler: ServerMessageHandler = {
  setMessage: async (c: Context, message: string) => {
    await setCookieHelper(c, SERVER_MESSAGE_COOKIE_NAME, message, { maxAge: TTL_SEC });
  },
  getMessage: async (c: Context) => {
    const message = await getCookieHelper(c, SERVER_MESSAGE_COOKIE_NAME);
    deleteCookieHelper(c, SERVER_MESSAGE_COOKIE_NAME);
    return message || undefined;
  },
};

export { serverMessageHandler };
