import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { beforeEach, mock, test } from "node:test";
import { Hono } from "hono";
import { createClientIpResolver } from "../src/lib/clientIp.ts";

const counters = new Map();
let now;
let failure;
let invalidCount;
let invalidTtl;
let handled;
let sessionLookups;
let expirationChecks;

const redis = {
  get isReady() { return failure !== "not-ready"; },
  multi() {
    let key;
    let windowSec;
    return {
      incr(value) { key = value; return this; },
      expire(value, seconds, mode) {
        assert.equal(value, key);
        assert.equal(mode, "NX");
        windowSec = seconds;
        return this;
      },
      async exec() {
        if (failure === "exec") throw new Error("Simulated Redis transaction failure");
        let counter = counters.get(key);
        if (!counter || counter.expiresAt <= now) {
          counter = { count: 0, expiresAt: now + windowSec };
          counters.set(key, counter);
        }
        counter.count++;
        return [invalidCount === undefined ? counter.count : invalidCount, 1];
      },
    };
  },
  async ttl(key) {
    if (failure === "ttl") throw new Error("Simulated Redis TTL failure");
    return invalidTtl === undefined ? counters.get(key).expiresAt - now : invalidTtl;
  },
};

mock.module(new URL("../src/lib/redis/redis.ts", import.meta.url), {
  namedExports: {
    getRedis: async () => {
      if (failure === "connect") throw new Error("Simulated Redis connection failure");
      return redis;
    },
  },
});
const { createRateLimitMiddleware } = await import("../src/lib/middleware/rateLimit.ts");

beforeEach((t) => {
  counters.clear();
  now = 0;
  failure = undefined;
  invalidCount = undefined;
  invalidTtl = undefined;
  handled = 0;
  sessionLookups = 0;
  expirationChecks = 0;
  t.mock.method(console, "warn", () => {});
});

function createApp(options = {}) {
  const app = new Hono();
  app.use(createRateLimitMiddleware({ windowSec: 10, maxRequests: 2, prefix: "test", ...options }));
  app.get("/", (c) => { handled++; return c.text("ok"); });
  return app;
}

function request(app, peer = "203.0.113.10", headers = {}) {
  const env = peer === null ? {} : { incoming: { socket: { remoteAddress: peer } } };
  return app.request("https://app.example/", { headers }, env);
}

for (const header of ["x-forwarded-for", "x-real-ip", "forwarded", "user-agent"]) {
  test(`${header}を変更しても直アクセスの制限を回避できない`, async () => {
    const app = createApp();
    assert.equal((await request(app, undefined, { [header]: "198.51.100.1" })).status, 200);
    assert.equal((await request(app, undefined, { [header]: "198.51.100.2" })).status, 200);
    assert.equal((await request(app, undefined, { [header]: "198.51.100.3" })).status, 429);
    assert.equal(handled, 2);
    assert.deepEqual([...counters.keys()], ["test:ip:203.0.113.10"]);
  });
}

test("信頼済みプロキシ経由でも偽装したXFF先頭値を無視する", async () => {
  const app = createApp({ trustedProxies: ["10.0.0.0/24"] });
  for (let index = 0; index < 3; index++) {
    const response = await request(app, "10.0.0.5", {
      "x-forwarded-for": `198.51.100.${index}, 203.0.113.10`,
    });
    assert.equal(response.status, index < 2 ? 200 : 429);
  }
  assert.deepEqual([...counters.keys()], ["test:ip:203.0.113.10"]);
});

test("複数の信頼済みプロキシを右からたどり、非信頼ホップで止まる", async () => {
  const app = createApp({ trustedProxies: ["10.0.0.5", "2001:db8:1::/48"] });
  await request(app, "10.0.0.5", {
    "x-forwarded-for": "198.51.100.99, 203.0.113.10, 2001:db8:1::20",
  });
  assert.deepEqual([...counters.keys()], ["test:ip:203.0.113.10"]);
});

test("プロキシ設定があっても非信頼の接続元からのXFFを使わない", async () => {
  const app = createApp({ trustedProxies: ["10.0.0.0/24"] });
  await request(app, "203.0.113.10", { "x-forwarded-for": "198.51.100.99" });
  assert.deepEqual([...counters.keys()], ["test:ip:203.0.113.10"]);
});

test("信頼済みプロキシを共有する別クライアントは別カウンターになる", async () => {
  const app = createApp({ trustedProxies: ["10.0.0.5"], maxRequests: 1 });
  assert.equal((await request(app, "10.0.0.5", { "x-forwarded-for": "203.0.113.1" })).status, 200);
  assert.equal((await request(app, "10.0.0.5", { "x-forwarded-for": "203.0.113.2" })).status, 200);
  assert.equal((await request(app, "10.0.0.5", { "x-forwarded-for": "203.0.113.1" })).status, 429);
});

for (const forwarded of ["garbage", "", "203.0.113.10:1234", "[2001:db8::1]", "203.0.113.10, unknown"]) {
  test(`不正な転送アドレスからカウンターを作らない: ${forwarded}`, async () => {
    const app = createApp({ trustedProxies: ["10.0.0.5"] });
    await request(app, "10.0.0.5", { "x-forwarded-for": forwarded, "x-real-ip": "198.51.100.1" });
    assert.deepEqual([...counters.keys()], ["test:ip:10.0.0.5"]);
  });
}

test("IPv6の省略・展開・大文字表記でカウンターを分割しない", async () => {
  const app = createApp();
  for (const [index, peer] of ["2001:db8::1", "2001:0DB8:0:0:0:0:0:1", "2001:db8:0::1"].entries()) {
    assert.equal((await request(app, peer)).status, index < 2 ? 200 : 429);
  }
  assert.deepEqual([...counters.keys()], ["test:ip:2001:db8::1"]);
});

test("IPv4とIPv4-mapped IPv6は同じIPとして扱う", async () => {
  const app = createApp();
  for (const [index, peer] of ["203.0.113.10", "::ffff:203.0.113.10", "::ffff:cb00:710a"].entries()) {
    assert.equal((await request(app, peer)).status, index < 2 ? 200 : 429);
  }
  assert.deepEqual([...counters.keys()], ["test:ip:203.0.113.10"]);
});

test("IPv4-mapped形式の接続元も設定済みIPv4プロキシとして照合する", async () => {
  const app = createApp({ trustedProxies: ["10.0.0.0/24"] });
  await request(app, "::ffff:10.0.0.5", { "x-forwarded-for": "203.0.113.10" });
  assert.deepEqual([...counters.keys()], ["test:ip:203.0.113.10"]);
});

test("接続元が不明でも任意ヘッダーにフォールバックしない", async () => {
  const app = createApp({ maxRequests: 1 });
  assert.equal((await request(app, null, { "user-agent": "one" })).status, 200);
  assert.equal((await request(app, null, { "x-forwarded-for": "198.51.100.1", "user-agent": "two" })).status, 429);
  assert.deepEqual([...counters.keys()], ["test:ip:unknown"]);
});

test("無効なプロキシ設定を起動時に拒否する", () => {
  for (const entry of ["*", "garbage", "10.0.0.0/33", "2001:db8::/129", "10.0.0.5,"]) {
    assert.throws(() => createClientIpResolver([entry]));
  }
});

test("同一ユーザーは接続IPを変えてもユーザー単位の上限を超えられない", async () => {
  const app = createApp({ userIdentifier: () => "user-a" });
  for (let index = 0; index < 3; index++) {
    const response = await request(app, `203.0.113.${index + 1}`);
    assert.equal(response.status, index < 2 ? 200 : 429);
    assert.equal(response.headers.get("X-RateLimit-Remaining"), String(Math.max(0, 1 - index)));
  }
  assert.equal(handled, 2);
});

test("同一IPではユーザーを変更してもIP単位の制限が残る", async () => {
  let userID;
  const app = createApp({ userIdentifier: () => userID });
  for (let index = 0; index < 3; index++) {
    userID = `user-${index}`;
    assert.equal((await request(app)).status, index < 2 ? 200 : 429);
  }
  assert.equal(counters.has("test:user:user-2"), false);
});

test("IP制限で拒否したリクエストはユーザー照合も実行しない", async () => {
  let lookups = 0;
  const app = createApp({ maxRequests: 1, userIdentifier: () => { lookups++; return undefined; } });
  await request(app);
  assert.equal((await request(app)).status, 429);
  assert.equal(lookups, 1);
});

for (const operation of ["connect", "not-ready", "exec", "ttl"]) {
  test(`Redisの${operation}障害時は503で処理を拒否する`, async () => {
    failure = operation;
    const response = await request(createApp());
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Retry-After"), "1");
    assert.equal(handled, 0);
  });
}

test("ユーザー照合が失敗した場合も処理を許可しない", async () => {
  const app = createApp({ userIdentifier: () => { throw new Error("User lookup failed"); } });
  assert.equal((await request(app)).status, 503);
  assert.equal(handled, 0);
});

for (const value of [null, "1", 0, -1, 1.5]) {
  test(`不正なRedisカウンターを許可扱いにしない: ${JSON.stringify(value)}`, async () => {
    invalidCount = value;
    assert.equal((await request(createApp())).status, 503);
    assert.equal(handled, 0);
  });
}

test("TTLがないカウンターは503で拒否する", async () => {
  invalidTtl = -1;
  assert.equal((await request(createApp())).status, 503);
  assert.equal(handled, 0);
});

test("上限を超えたときだけ429とRetry-Afterを返す", async () => {
  const app = createApp();
  const first = await request(app);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get("X-RateLimit-Limit"), "2");
  assert.equal(first.headers.get("X-RateLimit-Remaining"), "1");
  assert.equal(first.headers.get("Retry-After"), null);
  assert.equal((await request(app)).status, 200);
  const rejected = await request(app);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("X-RateLimit-Remaining"), "0");
  assert.equal(rejected.headers.get("Retry-After"), "10");
});

test("ウィンドウを延長せず、有効期限後は再び許可する", async () => {
  const app = createApp({ maxRequests: 1 });
  await request(app);
  now = 5;
  const rejected = await request(app);
  assert.equal(rejected.status, 429);
  assert.equal(rejected.headers.get("Retry-After"), "5");
  now = 11;
  assert.equal((await request(app)).status, 200);
});

test("別のアプリインスタンスも同じRedisカウンターを共有する", async () => {
  const first = createApp();
  const second = createApp();
  assert.equal((await request(first)).status, 200);
  assert.equal((await request(second)).status, 200);
  assert.equal((await request(first)).status, 429);
});

test("並行リクエストでも上限を超える処理を許可しない", async () => {
  const app = createApp();
  const responses = await Promise.all(Array.from({ length: 8 }, () => request(app)));
  assert.equal(responses.filter(({ status }) => status === 200).length, 2);
  assert.equal(responses.filter(({ status }) => status === 429).length, 6);
  assert.equal(handled, 2);
});

test("後続ハンドラーの例外をレート制限の503として処理しない", async () => {
  const app = new Hono();
  app.use(createRateLimitMiddleware({ windowSec: 10, maxRequests: 2 }));
  app.get("/", () => { throw new Error("Handler failed"); });
  app.onError((_, c) => c.text("handler error", 500));
  const response = await request(app);
  assert.equal(response.status, 500);
  assert.equal(await response.text(), "handler error");
});

function parseProxyEnv(value) {
  return spawnSync(process.execPath, [
    "--import", "tsx", "--input-type=module", "--eval",
    "const { typedEnv } = await import('./src/env.ts'); process.stdout.write(JSON.stringify(typedEnv.RATE_LIMIT_TRUSTED_PROXIES));",
  ], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
    env: {
      SystemRoot: process.env.SystemRoot,
      NODE_ENV: "test",
      SIGNED_COOKIE_SECRET: "rate-limit-test-secret-".repeat(2),
      REDIS_URL: "redis://localhost:6379",
      RP_ID: "localhost",
      ORIGIN: "http://localhost:3000",
      ...(value === undefined ? {} : { RATE_LIMIT_TRUSTED_PROXIES: value }),
    },
  });
}

test("プロキシ環境変数の未設定・空文字は信頼するプロキシなしになる", () => {
  for (const value of [undefined, ""]) {
    const result = parseProxyEnv(value);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), []);
  }
});

test("プロキシ環境変数はIP・CIDRのカンマ区切りを検証する", () => {
  const result = parseProxyEnv("10.0.0.5, 2001:db8:1::/48");
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), ["10.0.0.5", "2001:db8:1::/48"]);
});

test("無効なプロキシ環境変数では起動時検証を通さない", () => {
  for (const value of ["*", "10.0.0.0/33", "10.0.0.5,"]) {
    assert.notEqual(parseProxyEnv(value).status, 0);
  }
});

let applicationFetch;
mock.module("@hono/node-server", {
  namedExports: { serve: ({ fetch }) => { applicationFetch = fetch; } },
});
mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: { typedEnv: {
    NODE_ENV: "test", RATE_LIMIT_WINDOW_SEC: 10, RATE_LIMIT_MAX_REQUESTS: 2,
    RATE_LIMIT_TRUSTED_PROXIES: [],
  } },
});
mock.module(new URL("../src/lib/auth/loginSession.ts", import.meta.url), {
  namedExports: {
    loginSessionController: {
      getLoginState: async () => {
        sessionLookups++;
        return { state: "LOGGED_IN", userData: { userID: "user-a" } };
      },
    },
    loginSessionExpirationMiddleware: async (_, next) => { expirationChecks++; await next(); },
  },
});
mock.module(new URL("../src/rootRenderer.tsx", import.meta.url), {
  defaultExport: async (_, next) => next(),
});
mock.module(new URL("../src/routes/index.tsx", import.meta.url), {
  defaultExport: new Hono()
    .get("/auth/test", (c) => { handled++; return c.text("ok"); })
    .get("/profile/test", (c) => { handled++; return c.text("ok"); }),
});
mock.module("hono/logger", { namedExports: { logger: () => async (_, next) => next() } });
await import("../src/index.tsx");

function applicationRequest(path, peer) {
  return applicationFetch(new Request(`https://app.example${path}`), {
    incoming: { socket: { remoteAddress: peer } },
  });
}

test("アプリは認証・プロフィールでユーザー単位の制限を共有する", async () => {
  assert.equal((await applicationRequest("/auth/test", "203.0.113.1")).status, 200);
  assert.equal((await applicationRequest("/profile/test", "203.0.113.2")).status, 200);
  assert.equal((await applicationRequest("/auth/test", "203.0.113.3")).status, 429);
  assert.equal(expirationChecks, 2);
  assert.equal(handled, 2);
});

test("アプリのIP制限を超えた場合はセッション照合・期限処理を実行しない", async () => {
  for (let index = 0; index < 3; index++) {
    assert.equal((await applicationRequest("/auth/test", "203.0.113.1")).status, index < 2 ? 200 : 429);
  }
  assert.equal(sessionLookups, 2);
  assert.equal(expirationChecks, 2);
  assert.equal(handled, 2);
});
