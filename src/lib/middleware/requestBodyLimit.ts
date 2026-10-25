import type { MiddlewareHandler } from "hono";

export const MAX_REQUEST_BODY_BYTES = 64 * 1024;

export const requestBodyLimit: MiddlewareHandler = async (c, next) => {
  const body = c.req.raw.body;
  if (!body) return next();

  const tooLarge = () => c.json({ error: "リクエスト本文は64 KiB以下にしてください。" }, 413);
  const contentLength = c.req.header("content-length");
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_REQUEST_BODY_BYTES
  ) {
    void body.cancel().catch(() => {});
    return tooLarge();
  }

  const reader = body.getReader();
  const bytes = new Uint8Array(MAX_REQUEST_BODY_BYTES);
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > MAX_REQUEST_BODY_BYTES) {
        void reader.cancel().catch(() => {});
        return tooLarge();
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
  } catch {
    return c.json({ error: "リクエスト本文を読み取れませんでした。" }, 400);
  } finally {
    reader.releaseLock();
  }

  c.req.raw = new Request(c.req.raw, { body: bytes.subarray(0, size) });
  await next();
};
