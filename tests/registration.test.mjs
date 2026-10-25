import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { Hono } from "hono";
import * as webauthn from "@simplewebauthn/server";

const redisData = new Map();
const createdUsers = [];
const createdPasskeys = [];
const transactions = [];
let passkeyCount;
let verificationCount;
let verificationFails;

mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: {
    typedEnv: {
      NODE_ENV: "test",
      COOKIE_SECURE: "false",
      SIGNED_COOKIE_SECRET: "registration-test-secret-".repeat(2),
      RP_ID: "localhost",
      ORIGIN: "http://localhost:3000",
    },
  },
});

mock.module(new URL("../src/lib/redis/redis.ts", import.meta.url), {
  namedExports: {
    getRedis: async () => ({
      set: async (key, value) => redisData.set(key, value),
      get: async (key) => redisData.get(key) ?? null,
      getDel: async (key) => {
        const value = redisData.get(key) ?? null;
        redisData.delete(key);
        return value;
      },
      del: async (key) => Number(redisData.delete(key)),
    }),
  },
});

const prisma = {
  user: {
    create: async ({ data }) => {
      const user = { id: "new-user", ...data };
      createdUsers.push(user);
      return user;
    },
  },
  passkey: {
    findUnique: async ({ where }) =>
      where.id === `${where.userID}-key` ? { id: where.id } : null,
    findMany: async ({ where }) =>
      Array.from({ length: passkeyCount }, (_, index) => ({
        id: `existing-key-${index}`,
        userID: where.userID,
        webauthnUserID: "existing-webauthn-user",
      })),
    count: async () => passkeyCount,
    create: async ({ data }) => {
      createdPasskeys.push(data);
      return data;
    },
  },
  $transaction: async (callback, options) => {
    transactions.push(options);
    return callback(prisma);
  },
};

mock.module(new URL("../src/prisma.ts", import.meta.url), { defaultExport: prisma });
mock.module("@simplewebauthn/server", {
  namedExports: {
    ...webauthn,
    verifyRegistrationResponse: async () => {
      verificationCount++;
      if (verificationFails) throw new Error("Invalid registration response");
      return {
        verified: true,
        registrationInfo: {
          credential: {
            id: "new-key",
            publicKey: new Uint8Array([1, 2, 3]),
            counter: 0,
            transports: ["internal"],
          },
          credentialDeviceType: "multiDevice",
          credentialBackedUp: true,
          aaguid: "00000000-0000-0000-0000-000000000000",
        },
      };
    },
  },
});

const { default: registrationApp } = await import("../src/routes/auth/webauthn/index.tsx");
const { loginSessionController } = await import("../src/lib/auth/loginSession.ts");
const { reauthSessionController } = await import("../src/lib/auth/reauthSession.ts");
const { webauthnSessionController } = await import("../src/lib/auth/webauthnSession.ts");

const app = new Hono();
app.route("/webauthn", registrationApp);
app.post("/test/login/:userID", async (c) => {
  const userID = c.req.param("userID");
  await loginSessionController.setLoggedIn(c, {
    userID,
    username: userID,
    usedPasskeyID: `${userID}-key`,
  });
  return c.json({});
});
app.post("/test/logout", async (c) => {
  await loginSessionController.setLoggedOut(c);
  return c.json({});
});
app.post("/test/reauth/:userID", async (c) => {
  await reauthSessionController.initialize(c, { userId: c.req.param("userID") });
  return c.json({});
});
app.post("/test/register", async (c) => {
  await webauthnSessionController.registration.generate.initialize(c, { username: "new-user" });
  return c.json({});
});

beforeEach(() => {
  redisData.clear();
  createdUsers.length = 0;
  createdPasskeys.length = 0;
  transactions.length = 0;
  passkeyCount = 1;
  verificationCount = 0;
  verificationFails = false;
});

async function request(cookies, path, method = "POST", body) {
  const headers = { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await app.request(`http://localhost:3000${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";", 1)[0];
    const equals = pair.indexOf("=");
    const name = pair.slice(0, equals);
    const value = pair.slice(equals + 1);
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }
  return response;
}

async function generate(cookies) {
  return request(cookies, "/webauthn/registration/generate", "GET");
}

async function verify(cookies) {
  return request(cookies, "/webauthn/registration/verify", "POST", {
    body: {
      id: "new-key", rawId: "new-key", type: "public-key", clientExtensionResults: {},
      response: { clientDataJSON: "AA", attestationObject: "AA" },
    },
  });
}

async function startNewAccount() {
  const cookies = new Map();
  await request(cookies, "/test/register");
  assert.equal((await generate(cookies)).status, 200);
  return cookies;
}

async function startPasskeyAddition() {
  const cookies = new Map();
  await request(cookies, "/test/login/user-a");
  await request(cookies, "/test/reauth/user-a");
  const response = await generate(cookies);
  assert.equal(response.status, 200);
  const options = await response.json();
  assert.equal(options.authorization, undefined);
  return cookies;
}

function assertNoWrites() {
  assert.equal(verificationCount, 0);
  assert.deepEqual(createdUsers, []);
  assert.deepEqual(createdPasskeys, []);
  assert.deepEqual(transactions, []);
}

test("未ログインの新規登録は新しいユーザーにだけパスキーを保存する", async () => {
  const cookies = await startNewAccount();
  assert.equal((await verify(cookies)).status, 200);
  assert.equal(createdUsers.length, 1);
  assert.equal(createdUsers[0].name, "new-user");
  assert.equal(createdPasskeys[0].userID, createdUsers[0].id);
});

test("匿名で発行したチャレンジをログイン後のパスキー追加に流用できない", async () => {
  const cookies = await startNewAccount();
  await request(cookies, "/test/login/victim");
  assert.equal((await verify(cookies)).status, 401);
  assertNoWrites();
});

test("再認証なしでは追加用チャレンジを発行しない", async () => {
  const cookies = new Map();
  await request(cookies, "/test/login/user-a");
  assert.equal((await generate(cookies)).status, 401);
  assertNoWrites();
});

test("別ユーザーの再認証トークンでは追加用チャレンジを発行しない", async () => {
  const cookies = new Map();
  await request(cookies, "/test/login/user-a");
  await request(cookies, "/test/reauth/user-b");
  assert.equal((await generate(cookies)).status, 401);
  assertNoWrites();
});

test("再認証した同じログインセッションでは対象ユーザーへ追加できる", async () => {
  const cookies = await startPasskeyAddition();
  assert.equal((await verify(cookies)).status, 200);
  assert.deepEqual(createdUsers, []);
  assert.equal(createdPasskeys[0].userID, "user-a");
  assert.equal(createdPasskeys[0].id, "new-key");
  assert.deepEqual(transactions, [{ isolationLevel: "Serializable" }]);
});

for (const [label, changeSession] of [
  ["別ユーザーに切り替えた", (cookies) => request(cookies, "/test/login/user-b")],
  ["ログアウトした", (cookies) => request(cookies, "/test/logout")],
  ["同じユーザーで再ログインした", (cookies) => request(cookies, "/test/login/user-a")],
]) {
  test(`追加用チャレンジ発行後に${label}場合は拒否する`, async () => {
    const cookies = await startPasskeyAddition();
    await changeSession(cookies);
    assert.equal((await verify(cookies)).status, 401);
    assertNoWrites();
  });
}

test("操作種別のない更新前の登録セッションは拒否する", async () => {
  const cookies = await startNewAccount();
  const key = [...redisData.keys()].find((key) => key.startsWith("webauthn-registration:"));
  const data = JSON.parse(redisData.get(key));
  delete data.authorization;
  redisData.set(key, JSON.stringify(data));
  assert.equal((await verify(cookies)).status, 401);
  assertNoWrites();
});

test("登録チャレンジは検証成功後に再利用できない", async () => {
  const cookies = await startPasskeyAddition();
  const replayCookies = new Map(cookies);
  assert.equal((await verify(cookies)).status, 200);
  assert.equal((await verify(replayCookies)).status, 401);
  assert.equal(verificationCount, 1);
  assert.equal(createdPasskeys.length, 1);
});

test("発行後にパスキー数が上限に達した場合は保存しない", async (t) => {
  const cookies = await startPasskeyAddition();
  passkeyCount = 10;
  t.mock.method(console, "error", () => {});
  assert.equal((await verify(cookies)).status, 400);
  assert.deepEqual(createdUsers, []);
  assert.deepEqual(createdPasskeys, []);
});

test("WebAuthn 検証失敗時は保存せず、チャレンジも再利用できない", async (t) => {
  const cookies = await startNewAccount();
  const replayCookies = new Map(cookies);
  verificationFails = true;
  t.mock.method(console, "error", () => {});
  assert.equal((await verify(cookies)).status, 400);
  verificationFails = false;
  assert.equal((await verify(replayCookies)).status, 401);
  assert.equal(verificationCount, 1);
  assert.deepEqual(createdUsers, []);
  assert.deepEqual(createdPasskeys, []);
});
