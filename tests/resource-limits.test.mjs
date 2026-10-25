import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import { requestBodyLimit, MAX_REQUEST_BODY_BYTES } from "../src/lib/middleware/requestBodyLimit.ts";
import { registrationResponseSchema, authenticationResponseSchema } from "../src/lib/schema/webauthn.ts";
import { PRF_CONSTRAINTS, getPrfPayloadBytes } from "../src/lib/auth/prfHelpers.ts";
import {
  serializeRegistrationCredential,
  serializeAuthenticationCredential,
} from "../src/client/lib/webauthn/serialization.ts";

let handled;
let challengeLookups;
let entries;
let revision;
let query;
let managementProps;
let failure;
let loggedIn;
let rateChecks;
const optionsSeen = [];

const bodyApp = new Hono().use(requestBodyLimit).all("/", async (c) => {
  handled++;
  return c.json({ bytes: (await c.req.arrayBuffer()).byteLength });
});

beforeEach((t) => {
  handled = 0; challengeLookups = 0; entries = []; revision = 0;
  query = undefined; managementProps = undefined; failure = undefined;
  loggedIn = true; rateChecks = 0; optionsSeen.length = 0;
  t.mock.method(console, "error", () => {});
});

function streamed(chunks, headers = {}, source = {}) {
  let index = 0;
  return new Request("https://app.example/", {
    method: "POST", headers, duplex: "half",
    body: new ReadableStream({
      pull(controller) {
        if (index < chunks.length) controller.enqueue(chunks[index++]);
        else controller.close();
      },
      ...source,
    }, { highWaterMark: 0 }),
  });
}

test("本文なしのリクエストは通常どおり処理する", async () => {
  assert.equal((await bodyApp.request("/")).status, 200);
  assert.equal(handled, 1);
});

for (const size of [MAX_REQUEST_BODY_BYTES, MAX_REQUEST_BODY_BYTES + 1]) {
  test(`実際の本文${size}バイトで上限を判定する`, async () => {
    const response = await bodyApp.fetch(streamed([new Uint8Array(size)]));
    assert.equal(response.status, size <= MAX_REQUEST_BODY_BYTES ? 200 : 413);
    assert.equal(handled, size <= MAX_REQUEST_BODY_BYTES ? 1 : 0);
    if (response.status === 200) assert.equal((await response.json()).bytes, size);
  });
}

for (const headers of [
  { "Content-Length": "0" }, { "Content-Length": "1" },
  { "Transfer-Encoding": "chunked" },
  { "Content-Length": "1", "Transfer-Encoding": "chunked" },
  { "Content-Length": "not-a-number" },
]) {
  test(`本文サイズをヘッダーだけで信頼しない: ${JSON.stringify(headers)}`, async () => {
    const response = await bodyApp.fetch(streamed([
      new Uint8Array(MAX_REQUEST_BODY_BYTES), new Uint8Array(1),
    ], headers));
    assert.equal(response.status, 413);
    assert.equal(handled, 0);
  });
}

test("超過時は読み取りを止め、キャンセルの完了を待たず413を返す", { timeout: 1000 }, async () => {
  let cancelled = false;
  const response = await bodyApp.fetch(streamed([new Uint8Array(MAX_REQUEST_BODY_BYTES + 1)], {}, {
    cancel() { cancelled = true; return new Promise(() => {}); },
  }));
  assert.equal(response.status, 413);
  assert.equal(cancelled, true);
  assert.equal(handled, 0);
});

test("過大なContent-Lengthは本文を読み始めずに拒否する", async () => {
  let pulled = false;
  const response = await bodyApp.fetch(streamed([], { "Content-Length": String(MAX_REQUEST_BODY_BYTES + 1) }, {
    pull() { pulled = true; },
  }));
  assert.equal(response.status, 413);
  assert.equal(pulled, false);
});

test("文字数ではなくUTF-8バイト数を制限する", async () => {
  const response = await bodyApp.request("/", { method: "POST", body: "あ".repeat(22000) });
  assert.equal(response.status, 413);
  assert.equal(handled, 0);
});

test("壊れたストリームは後続に渡さず400を返す", async () => {
  const response = await bodyApp.fetch(streamed([], {}, {
    pull(controller) { controller.error(new Error("Read failed")); },
  }));
  assert.equal(response.status, 400);
  assert.equal(handled, 0);
});

test("上限内のJSONは読み直せる形で後続へ渡す", async () => {
  const app = new Hono().use(requestBodyLimit).post("/", async (c) => c.json(await c.req.json()));
  const payload = { username: "test", message: "日本語" };
  const response = await app.request("/", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), payload);
});

const registration = {
  id: "credential", rawId: "credential", type: "public-key", clientExtensionResults: {},
  response: { clientDataJSON: "AA", attestationObject: "AA" },
};
const authentication = {
  id: "credential", rawId: "credential", type: "public-key", clientExtensionResults: {},
  response: { clientDataJSON: "AA", authenticatorData: "AA", signature: "AA", userHandle: null },
};

test("通常のWebAuthn応答とnullの省略可能項目を受け入れる", () => {
  assert.equal(registrationResponseSchema.safeParse(registration).success, true);
  const parsed = authenticationResponseSchema.parse({ ...authentication, authenticatorAttachment: null });
  assert.equal(parsed.response.userHandle, undefined);
  assert.equal(parsed.authenticatorAttachment, undefined);
});

for (const [label, change] of [
  ["IDの型", (body) => { body.id = { not: "credential" }; }],
  ["IDの長さ", (body) => { body.id = "A".repeat(2049); }],
  ["rawIdとの不一致", (body) => { body.rawId = "different"; }],
  ["credential type", (body) => { body.type = "password"; }],
  ["clientDataJSONの長さ", (body) => { body.response.clientDataJSON = "A".repeat(4097); }],
  ["Base64URL以外の文字", (body) => { body.response.clientDataJSON = "+/="; }],
]) {
  test(`WebAuthn応答の${label}を検証する`, () => {
    for (const [schema, fixture] of [[registrationResponseSchema, registration], [authenticationResponseSchema, authentication]]) {
      const body = structuredClone(fixture);
      change(body);
      assert.equal(schema.safeParse(body).success, false);
    }
  });
}

test("attestationと署名の個別サイズにも上限を設ける", () => {
  assert.equal(registrationResponseSchema.safeParse({ ...registration, response: {
    ...registration.response, attestationObject: "A".repeat(48 * 1024 + 1),
  } }).success, false);
  assert.equal(authenticationResponseSchema.safeParse({ ...authentication, response: {
    ...authentication.response, signature: "A".repeat(4097),
  } }).success, false);
});

test("ブラウザー応答の変換はサーバースキーマを満たし、PRF秘密出力を送らない", (t) => {
  const buffer = new Uint8Array([0, 255]).buffer;
  class AttestationResponse {
    clientDataJSON = buffer;
    attestationObject = buffer;
    getTransports() { return ["internal", "unknown-future-transport"]; }
  }
  class AssertionResponse {
    clientDataJSON = buffer;
    authenticatorData = buffer;
    signature = buffer;
    userHandle = null;
  }
  class TestCredential {
    id = "AP8";
    rawId = buffer;
    authenticatorAttachment = null;
    constructor(response) { this.response = response; }
    getClientExtensionResults() {
      return { credProps: { rk: true }, prf: { results: { first: "SECRET" } } };
    }
  }
  for (const [name, value] of Object.entries({
    PublicKeyCredential: TestCredential,
    AuthenticatorAttestationResponse: AttestationResponse,
    AuthenticatorAssertionResponse: AssertionResponse,
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  const registration = serializeRegistrationCredential(new TestCredential(new AttestationResponse()));
  const authentication = serializeAuthenticationCredential(new TestCredential(new AssertionResponse()));
  assert.equal(registrationResponseSchema.safeParse(JSON.parse(JSON.stringify(registration))).success, true);
  assert.equal(authenticationResponseSchema.safeParse(JSON.parse(JSON.stringify(authentication))).success, true);
  assert.deepEqual(registration.response.transports, ["internal"]);
  assert.equal(authentication.response.userHandle, undefined);
  assert.equal(JSON.stringify([registration, authentication]).includes("SECRET"), false);
});

const validPayload = {
  passkeyId: "key-a", ciphertext: Buffer.from("encrypted").toString("base64"),
  iv: Buffer.alloc(12).toString("base64"), tag: Buffer.alloc(16).toString("base64"),
  prfInput: Buffer.alloc(32).toString("base64"), label: "entry", version: 1,
};
const userID = "user-a";
const passkey = { id: "key-a", userID, name: "Key" };
const conflict = () => new Prisma.PrismaClientKnownRequestError("Write conflict", { code: "P2034", clientVersion: "6.4.1" });

const prisma = {
  passkey: {
    findFirst: async ({ where }) => where.id === passkey.id && where.userID === userID ? passkey : null,
    findUnique: async ({ where }) => where.id === passkey.id && where.userID === userID ? passkey : null,
    findMany: async (args) => {
      query = args;
      return [{ ...passkey, _count: { prfCiphertexts: 0 }, passkeyHistories: [
        { id: "latest", passkeyID: "key-a", usedAt: new Date(), usedBrowser: "Test", usedOS: "Test", type: "LOGIN" },
      ] }];
    },
  },
  prfCiphertext: {
    findUnique: async ({ where }) => entries.find((entry) => entry.id === where.id) ?? null,
    delete: async ({ where }) => { entries = entries.filter((entry) => entry.id !== where.id); revision++; },
  },
  passkeyHistory: { deleteMany: async () => ({ count: 100 }) },
  $transaction: async (callback, options) => {
    optionsSeen.push(options);
    const baseRevision = revision;
    const snapshot = structuredClone(entries);
    let wrote = false;
    const result = await callback({ prfCiphertext: {
      findMany: async (args) => {
        query = args;
        return snapshot.filter((entry) => entry.userID === args.where.userID).slice(0, args.take);
      },
      create: async ({ data }) => {
        if (failure === "write") throw new Error("Write failed");
        const entry = { ...data, id: `entry-${snapshot.length}`, createdAt: new Date() };
        snapshot.push(entry); wrote = true;
        return entry;
      },
    } });
    if (wrote) {
      if (failure === "conflict" || revision !== baseRevision) throw conflict();
      entries = snapshot; revision++;
    }
    return result;
  },
};
mock.module(new URL("../src/prisma.ts", import.meta.url), { defaultExport: prisma });
mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: { typedEnv: { NODE_ENV: "test", RP_ID: "localhost" } },
});
mock.module(new URL("../src/lib/auth/loginSession.ts", import.meta.url), {
  namedExports: {
    loginSessionController: { getLoginState: async () => loggedIn
      ? { state: "LOGGED_IN", userData: { userID, usedPasskeyID: "key-a" } }
      : { state: "LOGGED_OUT" } },
    loginSessionExpirationMiddleware: async (_, next) => next(),
  },
});
mock.module(new URL("../src/lib/auth/reauthSession.ts", import.meta.url), {
  namedExports: { reauthSessionController: {} },
});
const challengeHandler = { extractSessionData: async () => { challengeLookups++; return undefined; } };
mock.module(new URL("../src/lib/auth/webauthnSession.ts", import.meta.url), {
  namedExports: { webauthnSessionController: {
    registration: { verify: challengeHandler }, authentication: { verify: challengeHandler },
    reauthentication: { verify: challengeHandler }, testAuthentication: { verify: challengeHandler },
    prfAuthentication: { verify: challengeHandler },
  } },
});
mock.module(new URL("../src/components/auth/PasskeyManagemet.tsx", import.meta.url), {
  defaultExport: (props) => { managementProps = props; return "passkeys"; },
});
mock.module(new URL("../src/routes/auth/renderer.tsx", import.meta.url), {
  defaultExport: async (_, next) => next(),
});
const { default: authApp } = await import("../src/routes/auth/index.tsx");
const app = new Hono().use(requestBodyLimit).use(async (c, next) => {
  c.setRenderer((content) => c.html(content));
  await next();
}).route("/auth", authApp);

function post(path, payload) {
  return app.request(`https://app.example/auth${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
}
const encrypt = (payload = validPayload) => post("/webauthn/prf/encrypt", payload);
const existing = (index, overrides = {}) => ({
  ...validPayload, passkeyID: "key-a", associatedData: null, label: validPayload.label,
  id: `existing-${index}`, userID, ...overrides,
});

for (const path of ["registration", "authentication", "reauthentication", "test-authentication", "prf/assertion"]) {
  test(`${path}の不正な応答はチャレンジ消費・DB処理前に拒否する`, async () => {
    assert.equal((await post(`/webauthn/${path}/verify`, { body: { id: { not: "key" } } })).status, 400);
    assert.equal(challengeLookups, 0);
    assert.equal(query, undefined);
  });
}

test("管理画面は各パスキーの最新履歴1件だけをDBで取得する", async () => {
  const response = await app.request("https://app.example/auth/passkey-management");
  assert.equal(response.status, 200);
  await response.text();
  assert.equal(query.include.passkeyHistories.take, 1);
  assert.deepEqual(query.include.passkeyHistories.orderBy, [{ usedAt: "desc" }, { id: "desc" }]);
  assert.equal(managementProps.passkeyData[0].lastUsed.id, "latest");
  assert.equal(managementProps.passkeyData[0].passkey.passkeyHistories, undefined);
});

test("正常なPRFデータはユーザーの保存枠内で保存する", async () => {
  const response = await encrypt();
  assert.equal(response.status, 201);
  assert.equal((await response.json()).entry.passkeyId, "key-a");
  assert.equal(entries.length, 1);
  assert.deepEqual(optionsSeen, [{ isolationLevel: "Serializable" }]);
  assert.equal(query.take, PRF_CONSTRAINTS.MAX_ENTRIES_PER_USER + 1);
});

for (const field of ["iv", "tag"]) {
  test(`PRFの${field}はデコード前に文字列長を制限する`, async () => {
    assert.equal((await encrypt({ ...validPayload, [field]: "A".repeat(65) })).status, 400);
    assert.equal(entries.length, 0);
    assert.equal(query, undefined);
  });
}

test("暗号文のデコード後4096バイト上限は維持する", async () => {
  assert.equal((await encrypt({ ...validPayload, ciphertext: Buffer.alloc(4097).toString("base64") })).status, 400);
  assert.equal(entries.length, 0);
});

test("PRF保存件数の上限直前は許可し、上限到達後は拒否する", async () => {
  entries = Array.from({ length: 99 }, (_, index) => existing(index));
  assert.equal((await encrypt()).status, 201);
  assert.equal(entries.length, 100);
  assert.equal((await encrypt()).status, 409);
  assert.equal(entries.length, 100);
});

test("別ユーザーの保存量は自分の保存枠に含めない", async () => {
  entries = Array.from({ length: 100 }, (_, index) => existing(index, { userID: "user-b" }));
  assert.equal((await encrypt()).status, 201);
  assert.equal(entries.filter((entry) => entry.userID === userID).length, 1);
});

function seedBytes(size) {
  while (size > 0) {
    const amount = Math.min(size, 4096);
    entries.push(existing(entries.length, {
      ciphertext: "A".repeat(amount), iv: "", tag: "", prfInput: "", label: null, associatedData: null,
    }));
    size -= amount;
  }
}

test("文字列データ合計の上限ちょうどまで保存でき、超過分は拒否する", async () => {
  const size = getPrfPayloadBytes({ ...validPayload, associatedData: null });
  seedBytes(PRF_CONSTRAINTS.MAX_STORAGE_BYTES_PER_USER - size);
  assert.equal((await encrypt()).status, 201);
  assert.equal(entries.reduce((sum, entry) => sum + getPrfPayloadBytes(entry), 0), PRF_CONSTRAINTS.MAX_STORAGE_BYTES_PER_USER);
  assert.equal((await encrypt()).status, 409);
});

test("保存枠の計算は日本語ラベルなどもUTF-8バイト数で数える", async () => {
  const payload = { ...validPayload, label: "あ" };
  const size = getPrfPayloadBytes({ ...payload, associatedData: null });
  seedBytes(PRF_CONSTRAINTS.MAX_STORAGE_BYTES_PER_USER - size + 1);
  assert.equal((await encrypt(payload)).status, 409);
});

test("既存データを削除すれば保存枠を再利用できる", async () => {
  entries = Array.from({ length: 100 }, (_, index) => existing(index));
  assert.equal((await encrypt()).status, 409);
  assert.equal((await app.request("https://app.example/auth/webauthn/prf/entries/existing-0", { method: "DELETE" })).status, 200);
  assert.equal((await encrypt()).status, 201);
  assert.equal(entries.length, 100);
});

test("並行保存の競合では枠を超えず、再試行可能な409を返す", async () => {
  entries = Array.from({ length: 99 }, (_, index) => existing(index));
  const responses = await Promise.all([encrypt(), encrypt()]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [201, 409]);
  assert.equal(entries.length, 100);
});

for (const value of ["write", "conflict"]) {
  test(`保存の${value}失敗では追加データを残さない`, async () => {
    failure = value;
    assert.equal((await encrypt()).status, value === "conflict" ? 409 : 500);
    assert.equal(entries.length, 0);
  });
}

test("未ログイン・他人のパスキーへの保存は拒否する", async () => {
  loggedIn = false;
  assert.equal((await encrypt()).status, 401);
  loggedIn = true;
  assert.equal((await encrypt({ ...validPayload, passkeyId: "other-key" })).status, 404);
  assert.equal(entries.length, 0);
});

test("履歴一覧の小数・過大なページを拒否する", async () => {
  for (const payload of [{ page: 1001 }, { page: 1.5 }, { limit: 1.5 }]) {
    assert.equal((await post("/webauthn/passkey-histories", { passkeyId: "key-a", ...payload })).status, 400);
  }
});

test("履歴ID指定削除は100件までに制限する", async () => {
  const payload = { passkeyId: "key-a", historyIds: Array.from({ length: 100 }, (_, index) => String(index)) };
  assert.equal((await post("/webauthn/passkey-histories/delete", payload)).status, 200);
  assert.equal((await post("/webauthn/passkey-histories/delete", { ...payload, historyIds: [...payload.historyIds, "extra"] })).status, 400);
});

let applicationFetch;
mock.module("@hono/node-server", { namedExports: { serve: ({ fetch }) => { applicationFetch = fetch; } } });
mock.module(new URL("../src/lib/middleware/rateLimit.ts", import.meta.url), {
  namedExports: { createRateLimitMiddleware: () => async (_, next) => { rateChecks++; await next(); } },
});
mock.module(new URL("../src/rootRenderer.tsx", import.meta.url), { defaultExport: async (_, next) => next() });
mock.module(new URL("../src/routes/index.tsx", import.meta.url), { defaultExport: new Hono().route("/auth", authApp) });
mock.module("hono/logger", { namedExports: { logger: () => async (_, next) => next() } });
await import("../src/index.tsx");

test("実アプリでも大きなJSONをレート制限・認証・JSONパース前に拒否する", async () => {
  const response = await applicationFetch(new Request("https://app.example/auth/webauthn/registration/verify", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{" + " ".repeat(MAX_REQUEST_BODY_BYTES),
  }));
  assert.equal(response.status, 413);
  assert.equal(rateChecks, 0);
  assert.equal(challengeLookups, 0);
});
