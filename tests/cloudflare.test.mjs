import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { mock, test } from "node:test";
import { Hono } from "hono";
import { createClientIpResolver } from "../src/lib/clientIp.ts";
import { createUpstashStore } from "../src/lib/redis/upstash.ts";
import prisma, { prismaContext } from "../src/prisma.ts";

const encode = (value) => typeof value === "string" ? Buffer.from(value).toString("base64") : value;

test("同じRedis内のJSON文字列を維持し、GETDELとSET XXの意味を変えない", async () => {
  const values = new Map([["login:existing", '{"username":"既存ユーザー"}']]);
  const commands = [];
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(new URL(url).pathname, "/");
    const command = JSON.parse(init.body);
    commands.push(command);
    const [name, key, value] = command;
    let result;
    if (name.toLowerCase() === "set") {
      if (command.includes("xx") && !values.has(key)) result = null;
      else { values.set(key, value); result = "OK"; }
    } else {
      result = values.get(key) ?? null;
      if (name.toLowerCase() === "getdel") values.delete(key);
    }
    return Response.json({ result: encode(result) });
  });
  try {
    const store = createUpstashStore("https://redis.example.invalid", "test-token");
    const raw = await store.get("login:existing");
    assert.equal(typeof raw, "string");
    assert.equal(JSON.parse(raw).username, "既存ユーザー");
    assert.equal(await store.set("login:missing", "{}", { EX: 60, XX: true }), null);
    assert.equal(values.has("login:missing"), false);
    assert.equal(await store.set("challenge:one", '{"challenge":"a"}', { EX: 300 }), "OK");
    assert.equal(await store.getDel("challenge:one"), '{"challenge":"a"}');
    assert.equal(await store.getDel("challenge:one"), null);
    assert.ok(commands.some((command) => command.includes("ex") && command.includes(300)));
  } finally { fetchMock.mock.restore(); }
});

test("レート制限の加算とNX期限設定をRESTトランザクションで実行する", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(new URL(url).pathname, "/multi-exec");
    assert.deepEqual(JSON.parse(init.body), [["incr", "auth:ip:1"], ["expire", "auth:ip:1", 60, "NX"]]);
    return Response.json([{ result: 1 }, { result: 1 }]);
  });
  try {
    const store = createUpstashStore("https://redis.example.invalid", "test-token");
    assert.deepEqual(await store.multi().incr("auth:ip:1").expire("auth:ip:1", 60, "NX").exec(), [1, 1]);
  } finally { fetchMock.mock.restore(); }
});

test("Redis通信失敗時に消費済みかもしれないGETDELを自動再試行しない", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("network error"); });
  try {
    const store = createUpstashStore("https://redis.example.invalid", "test-token");
    await assert.rejects(store.getDel("challenge:one"));
    assert.equal(fetchMock.mock.callCount(), 1);
  } finally { fetchMock.mock.restore(); }
});

test("並行WorkerリクエストでPrisma接続とトランザクションの参照先が混ざらない", async () => {
  const original = process.env.CLOUDFLARE_WORKERS;
  process.env.CLOUDFLARE_WORKERS = "true";
  try {
    const results = await Promise.all(["a", "b"].map((id) => {
      const client = { user: { findUnique: async () => id }, $transaction() { return this.user.findUnique(); } };
      return prismaContext.run(client, async () => {
        await setImmediate();
        return [await prisma.user.findUnique(), await prisma.$transaction()];
      });
    }));
    assert.deepEqual(results, [["a", "a"], ["b", "b"]]);
    assert.throws(() => prisma.user, /request context is missing/);
  } finally {
    if (original === undefined) delete process.env.CLOUDFLARE_WORKERS;
    else process.env.CLOUDFLARE_WORKERS = original;
  }
});

test("WorkersだけでCloudflareのIPを使用し、XFF偽装を無視する", async () => {
  const original = process.env.CLOUDFLARE_WORKERS;
  const app = new Hono();
  const resolve = createClientIpResolver();
  app.get("/", (c) => c.text(resolve(c)));
  const headers = { "cf-connecting-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.1" };
  try {
    process.env.CLOUDFLARE_WORKERS = "true";
    assert.equal(await (await app.request("https://app.example/", { headers })).text(), "203.0.113.10");
    assert.equal(await (await app.request("https://app.example/", { headers: { "cf-connecting-ip": "garbage" } })).text(), "unknown");
    delete process.env.CLOUDFLARE_WORKERS;
    assert.equal(await (await app.request("https://app.example/", { headers })).text(), "unknown");
  } finally {
    if (original === undefined) delete process.env.CLOUDFLARE_WORKERS;
    else process.env.CLOUDFLARE_WORKERS = original;
  }
});
