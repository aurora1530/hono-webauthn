import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { Hono } from "hono";

let database;
let now;
let failure;
let updateGate;
const redisData = new Map();

mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: { typedEnv: {
    NODE_ENV: "test", COOKIE_SECURE: "false", RP_ID: "localhost",
    SIGNED_COOKIE_SECRET: "login-session-test-secret-".repeat(2),
  } },
});

const redis = {
  async set(key, value, options) {
    if (options.XX && updateGate) {
      const gate = updateGate;
      updateGate = undefined;
      gate.started.resolve();
      await gate.resume.promise;
    }
    if (options.XX && !redisData.has(key)) return null;
    redisData.set(key, { value, expiresAt: now + options.EX });
    return "OK";
  },
  async get(key) {
    if (failure === "redis-read") throw new Error("Redis unavailable");
    const entry = redisData.get(key);
    if (!entry || entry.expiresAt <= now) {
      redisData.delete(key);
      return null;
    }
    return entry.value;
  },
  async getDel(key) {
    const value = await redis.get(key);
    redisData.delete(key);
    return value;
  },
  async del(key) { return Number(redisData.delete(key)); },
};
mock.module(new URL("../src/lib/redis/redis.ts", import.meta.url), {
  namedExports: { getRedis: async () => redis },
});

function createDatabaseClient(getDatabase) {
  const matches = (key, where) =>
    (!where.id || key.id === where.id) && (!where.userID || key.userID === where.userID);
  return {
    passkey: {
      async findUnique({ where }) {
        if (failure === "passkey-read") throw new Error("Database unavailable");
        return getDatabase().passkeys.find((key) => matches(key, where)) ?? null;
      },
      async findMany({ where }) {
        return getDatabase().passkeys.filter((key) => matches(key, where));
      },
      async count({ where }) {
        return getDatabase().passkeys.filter((key) => matches(key, where)).length;
      },
      async delete({ where }) {
        if (failure === "passkey-delete") throw new Error("Deletion failed");
        const data = getDatabase();
        const key = data.passkeys.find((key) => matches(key, where));
        if (!key) throw new Error("Passkey not found");
        data.passkeys = data.passkeys.filter((entry) => entry.id !== key.id);
        return key;
      },
      async deleteMany({ where }) {
        const data = getDatabase();
        data.passkeys = data.passkeys.filter((key) => !matches(key, where));
      },
    },
    passkeyHistory: {
      async count({ where }) {
        const data = getDatabase();
        return data.histories.filter((history) => data.passkeys.some(
          (key) => key.id === history.passkeyID && key.userID === where.passkey.userID,
        )).length;
      },
      async deleteMany({ where }) {
        const data = getDatabase();
        const ids = typeof where.passkeyID === "string" ? [where.passkeyID] : where.passkeyID.in;
        data.histories = data.histories.filter((history) => !ids.includes(history.passkeyID));
      },
    },
    prfCiphertext: {
      async count() { return 0; },
      async deleteMany() {},
    },
    user: {
      async delete({ where }) {
        if (failure === "account-delete") throw new Error("Account deletion failed");
        const data = getDatabase();
        data.users = data.users.filter((user) => user.id !== where.id);
      },
    },
  };
}

const prisma = createDatabaseClient(() => database);
prisma.$transaction = async (callback) => {
  const snapshot = structuredClone(database);
  const result = await callback(createDatabaseClient(() => snapshot));
  database = snapshot;
  return result;
};
mock.module(new URL("../src/prisma.ts", import.meta.url), { defaultExport: prisma });

const { loginSessionController: firstController } = await import("../src/lib/auth/loginSession.ts");
const { loginSessionController: secondController } = await import("../src/lib/auth/loginSession.ts?instance=second");
const { reauthSessionController } = await import("../src/lib/auth/reauthSession.ts");
const { default: webauthnApp } = await import("../src/routes/auth/webauthn/index.tsx");
const { default: profileApp } = await import("../src/routes/profile/index.tsx");

function createApp(controller) {
  const app = new Hono();
  app.get("/state", async (c) => c.json(await controller.getLoginState(c)));
  app.post("/login/:userID/:passkeyID", async (c) => {
    const userID = c.req.param("userID");
    await controller.setLoggedIn(c, {
      userID, username: userID, usedPasskeyID: c.req.param("passkeyID"),
    });
    return c.json({});
  });
  app.post("/logout", async (c) => {
    await controller.setLoggedOut(c);
    return c.json({});
  });
  app.post("/debug", async (c) => {
    await controller.changeDebugMode(c, true);
    return c.json({});
  });
  app.post("/reauth", async (c) => {
    const state = await controller.getLoginState(c);
    assert.equal(state.state, "LOGGED_IN");
    await reauthSessionController.initialize(c, { userId: state.userData.userID });
    return c.json({});
  });
  app.onError((_, c) => c.json({ error: "Service unavailable" }, 503));
  return app;
}

const firstApp = createApp(firstController).route("/webauthn", webauthnApp).route("/profile", profileApp);
const secondApp = createApp(secondController);

beforeEach((t) => {
  database = {
    users: [{ id: "user-a" }, { id: "user-b" }],
    passkeys: [
      { id: "key-a1", userID: "user-a", name: "First key" },
      { id: "key-a2", userID: "user-a", name: "Second key" },
      { id: "key-b", userID: "user-b", name: "Other user key" },
    ],
    histories: [
      { id: "history-a1", passkeyID: "key-a1" },
      { id: "history-a2", passkeyID: "key-a2" },
    ],
  };
  now = 0;
  failure = undefined;
  updateGate = undefined;
  redisData.clear();
  t.mock.method(console, "error", () => {});
});

async function request(app, cookies, path, body) {
  const headers = { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") };
  if (body) headers["Content-Type"] = "application/json";
  const response = await app.request(`http://localhost:3000${path}`, {
    method: path === "/state" ? "GET" : "POST", headers,
    body: body ? JSON.stringify(body) : undefined,
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

async function login(passkey = "key-a1", user = "user-a") {
  const cookies = new Map();
  assert.equal((await request(firstApp, cookies, `/login/${user}/${passkey}`)).status, 200);
  return cookies;
}

async function state(app, cookies) {
  const response = await request(app, cookies, "/state");
  assert.equal(response.status, 200);
  return response.json();
}

test("独立したコントローラーは有効な署名Cookieを受け入れる", async () => {
  assert.notEqual(firstController, secondController);
  const cookies = await login();
  assert.equal((await state(firstApp, cookies)).state, "LOGGED_IN");
  assert.equal((await state(secondApp, cookies)).state, "LOGGED_IN");
});

test("別インスタンスでログアウトしても古いCookieはすぐに拒否する", async () => {
  const cookies = await login();
  const oldCookies = new Map(cookies);
  await state(firstApp, cookies);
  await state(secondApp, cookies);
  await request(firstApp, cookies, "/logout");
  assert.equal((await state(secondApp, oldCookies)).state, "EXPIRED");
  assert.equal((await state(firstApp, oldCookies)).state, "EXPIRED");
});

test("期限切れセッションをプロセス内キャッシュから受け入れない", async () => {
  const cookies = await login();
  await state(firstApp, cookies);
  await state(secondApp, cookies);
  now = 60 * 60 * 24 * 7 + 1;
  assert.equal((await state(firstApp, cookies)).state, "EXPIRED");
  assert.equal((await state(secondApp, cookies)).state, "EXPIRED");
});

test("削除したパスキーで作った全セッションを拒否し、他のパスキーのセッションは維持する", async () => {
  const owner = await login();
  const affected = [await login("key-a2"), await login("key-a2")];
  const otherUser = await login("key-b", "user-b");
  for (const cookies of affected) await state(secondApp, cookies);
  await request(firstApp, owner, "/reauth");
  assert.equal((await request(firstApp, owner, "/webauthn/delete-passkey", { passkeyId: "key-a2" })).status, 200);
  for (const cookies of affected) assert.equal((await state(secondApp, cookies)).state, "EXPIRED");
  assert.equal((await state(firstApp, owner)).state, "LOGGED_IN");
  assert.equal((await state(secondApp, otherUser)).state, "LOGGED_IN");
});

test("アカウント削除後は全端末・全パスキーのセッションを拒否する", async () => {
  const owner = await login();
  const oldOwner = new Map(owner);
  const affected = [await login(), await login("key-a2")];
  const otherUser = await login("key-b", "user-b");
  for (const cookies of affected) await state(secondApp, cookies);
  await request(firstApp, owner, "/reauth");
  assert.equal((await request(firstApp, owner, "/profile/delete-account", { confirmationText: "delete user-a" })).status, 200);
  assert.equal((await state(firstApp, owner)).state, "LOGGED_OUT");
  for (const cookies of [oldOwner, ...affected]) assert.equal((await state(secondApp, cookies)).state, "EXPIRED");
  assert.equal((await state(secondApp, otherUser)).state, "LOGGED_IN");
});

test("パスキー所有者とセッションのユーザーが一致しない場合は拒否する", async () => {
  const cookies = await login("key-b", "user-a");
  assert.equal((await state(firstApp, cookies)).state, "EXPIRED");
  assert.equal([...redisData.keys()].some((key) => key.startsWith("login:")), false);
});

for (const operation of ["passkey-delete", "account-delete"]) {
  test(`${operation}のトランザクション失敗では既存セッションを失効させない`, async () => {
    const owner = await login();
    const otherSession = await login("key-a2");
    await state(secondApp, otherSession);
    await request(firstApp, owner, "/reauth");
    failure = operation;
    const response = operation === "passkey-delete"
      ? await request(firstApp, owner, "/webauthn/delete-passkey", { passkeyId: "key-a2" })
      : await request(firstApp, owner, "/profile/delete-account", { confirmationText: "delete user-a" });
    assert.equal(response.status, 500);
    failure = undefined;
    assert.equal((await state(secondApp, otherSession)).state, "LOGGED_IN");
  });
}

test("設定更新とログアウトの競合でセッションを復活させない", async () => {
  const cookies = await login();
  const oldCookies = new Map(cookies);
  updateGate = { started: Promise.withResolvers(), resume: Promise.withResolvers() };
  const gate = updateGate;
  const updating = request(firstApp, cookies, "/debug");
  await gate.started.promise;
  await request(secondApp, new Map(oldCookies), "/logout");
  gate.resume.resolve();
  assert.equal((await updating).status, 200);
  assert.equal((await state(firstApp, oldCookies)).state, "EXPIRED");
  assert.equal([...redisData.keys()].some((key) => key.startsWith("login:")), false);
});

test("削除済みパスキーのセッションでは設定更新もできない", async () => {
  const cookies = await login();
  database.passkeys = database.passkeys.filter(({ id }) => id !== "key-a1");
  await request(firstApp, cookies, "/debug");
  assert.equal((await state(secondApp, cookies)).state, "EXPIRED");
});

for (const operation of ["redis-read", "passkey-read"]) {
  test(`${operation}が失敗した場合は過去の認証結果を使わない`, async () => {
    const cookies = await login();
    await state(firstApp, cookies);
    failure = operation;
    assert.equal((await request(firstApp, cookies, "/state")).status, 503);
    assert.equal((await request(secondApp, cookies, "/state")).status, 503);
  });
}

test("正常な設定更新ではセッションIDとログイン状態を維持する", async () => {
  const cookies = await login();
  const before = await state(firstApp, cookies);
  await request(firstApp, cookies, "/debug");
  const after = await state(secondApp, cookies);
  assert.equal(after.state, "LOGGED_IN");
  assert.equal(after.sessionID, before.sessionID);
  assert.equal(after.userData.debugMode, true);
});
