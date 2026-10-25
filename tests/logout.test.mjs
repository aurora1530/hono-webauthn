import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { Hono } from "hono";

const origin = "http://localhost:3000";
const redisData = new Map();
const deleted = [];
mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: { typedEnv: {
    NODE_ENV: "test", COOKIE_SECURE: "false", RP_ID: "localhost", ORIGIN: origin,
    SIGNED_COOKIE_SECRET: "logout-test-cookie-secret-".repeat(2),
    RATE_LIMIT_WINDOW_SEC: 60, RATE_LIMIT_MAX_REQUESTS: 120, RATE_LIMIT_TRUSTED_PROXIES: [],
  } },
});
mock.module(new URL("../src/lib/redis/redis.ts", import.meta.url), {
  namedExports: { getRedis: async () => ({
    set: async (key, value) => { redisData.set(key, value); return "OK"; },
    get: async (key) => redisData.get(key) ?? null,
    getDel: async (key) => { const value = redisData.get(key); redisData.delete(key); return value ?? null; },
    del: async (key) => { deleted.push(key); return Number(redisData.delete(key)); },
  }) },
});
mock.module(new URL("../src/prisma.ts", import.meta.url), {
  defaultExport: { passkey: { findUnique: async ({ where }) => ({ id: where.id }) } },
});
mock.module(new URL("../src/lib/middleware/rateLimit.ts", import.meta.url), {
  namedExports: { createRateLimitMiddleware: () => async (_, next) => next() },
});
mock.module("hono/logger", { namedExports: { logger: () => async (_, next) => next() } });
let applicationFetch;
mock.module("@hono/node-server", {
  namedExports: { serve: ({ fetch }) => { applicationFetch = fetch; } },
});
const { loginSessionController } = await import("../src/lib/auth/loginSession.ts");
await import("../src/index.tsx");

const sessionApp = new Hono();
sessionApp.post("/login", async (c) => {
  await loginSessionController.setLoggedIn(c, { userID: "user-a", username: "user-a", usedPasskeyID: "key-a" });
  return c.text("ok");
});
sessionApp.get("/state", async (c) => c.json(await loginSessionController.getLoginState(c)));
beforeEach(() => { redisData.clear(); deleted.length = 0; });

async function login() {
  const response = await sessionApp.request(`${origin}/login`, { method: "POST" });
  return response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
}
async function state(cookie) {
  return (await sessionApp.request(`${origin}/state`, { headers: { Cookie: cookie } })).json();
}
async function logout(cookie, { method = "POST", path = "/auth/logout", headers = {}, body } = {}) {
  return applicationFetch(new Request(`${origin}${path}`, {
    method, headers: { Cookie: cookie, ...headers }, body,
  }));
}
async function assertUnchanged(cookie, response, snapshot) {
  assert.deepEqual([...redisData], snapshot);
  assert.deepEqual(deleted, []);
  assert.equal((await state(cookie)).state, "LOGGED_IN");
  assert.equal(response.headers.getSetCookie().some((header) => header.startsWith("ls=")), false);
}

for (const method of ["GET", "HEAD"]) {
  test(`外部サイトからの${method}ではログアウトしない`, async () => {
    const cookie = await login();
    const snapshot = [...redisData];
    const response = await logout(cookie, { method, headers: { "Sec-Fetch-Site": "cross-site" } });
    assert.equal(response.status, 404);
    await assertUnchanged(cookie, response, snapshot);
  });
}

for (const contentType of ["application/x-www-form-urlencoded", "multipart/form-data; boundary=test", "text/plain"]) {
  for (const source of ["cross-site", "same-site", "null", "missing"]) {
    test(`外部・不明な送信元のフォームを拒否する: ${contentType}, ${source}`, async () => {
      const cookie = await login();
      const snapshot = [...redisData];
      const headers = { "Content-Type": contentType };
      if (source === "null") headers.Origin = "null";
      else if (source !== "missing") {
        headers.Origin = source === "same-site" ? "http://other.localhost:3000" : "https://other.example";
        headers["Sec-Fetch-Site"] = source;
      }
      const response = await logout(cookie, { headers, body: "" });
      assert.equal(response.status, 403);
      await assertUnchanged(cookie, response, snapshot);
    });
  }
}

for (const headers of [
  { Origin: "https://other.example", "Content-Type": "application/json" },
  { "Content-Type": "application/json" },
  { Origin: "null", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
  { Origin: "https://other.example", "Sec-Fetch-Site": "same-origin" },
  { Origin: "http://localhost:3001" },
  { Origin: "https://localhost:3000" },
]) {
  test(`本文形式によらずOrigin不一致・欠落を拒否する: ${JSON.stringify(headers)}`, async () => {
    const cookie = await login();
    const snapshot = [...redisData];
    const response = await logout(cookie, { headers, body: "" });
    assert.equal(response.status, 403);
    await assertUnchanged(cookie, response, snapshot);
  });
}

for (const headers of [
  { Origin: origin, "Content-Type": "application/x-www-form-urlencoded" },
  { "Sec-Fetch-Site": "same-origin", "Content-Type": "application/x-www-form-urlencoded" },
]) {
  test(`同一OriginのフォームでセッションとCookieを破棄し303を返す: ${JSON.stringify(headers)}`, async () => {
    const cookie = await login();
    const previousState = await state(cookie);
    const response = await logout(cookie, { headers, body: "" });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("Location"), "/");
    assert.ok(deleted.includes(`login:${previousState.sessionID}`));
    assert.equal(redisData.has(`login:${previousState.sessionID}`), false);
    assert.ok(response.headers.getSetCookie().some((header) => /^ls=;/.test(header) && /Max-Age=0/.test(header)));
    assert.notEqual((await state(cookie)).state, "LOGGED_IN");
  });
}

test("ログアウトは対象のログインセッションだけを破棄する", async () => {
  const cookie = await login();
  const otherCookie = await login();
  assert.equal((await logout(cookie, { headers: { Origin: origin } })).status, 303);
  assert.equal((await state(otherCookie)).state, "LOGGED_IN");
  assert.notEqual((await state(cookie)).state, "LOGGED_IN");
});

test("未ログイン・ログアウト済みの同一Origin POSTも安全に処理する", async () => {
  const cookie = await login();
  for (const value of [cookie, cookie, ""]) {
    assert.equal((await logout(value, { headers: { Origin: origin } })).status, 303);
  }
  assert.equal(redisData.size, 0);
});

test("認証画面とヘッダーのログアウトは確認付きPOSTフォームで表示する", async () => {
  const cookie = await login();
  const response = await applicationFetch(new Request(`${origin}/auth`, { headers: { Cookie: cookie } }));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.equal((html.match(/<form[^>]*method="post"[^>]*action="\/auth\/logout"/g) ?? []).length, 2);
  assert.equal((html.match(/onsubmit="return confirm\(/g) ?? []).length, 2);
  assert.equal((html.match(/type="submit"[^>]*>\s*(?:<span[^>]*>logout<\/span>\s*)?ログアウト/g) ?? []).length, 2);
  assert.doesNotMatch(html, /href="\/auth\/logout"/);
  assert.equal((await state(cookie)).state, "LOGGED_IN");
});
