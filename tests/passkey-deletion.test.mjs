import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { Hono } from "hono";

let database;
let loginState;
let reauthData;
let failure;
const operations = [];
const transactions = [];

function client(getDatabase, scope) {
  function record(method, where) {
    operations.push({ method, where, scope });
    if (failure === method) throw new Error(`Simulated ${method} failure`);
  }
  return {
    passkey: {
      findUnique: async ({ where }) => {
        record("passkey.findUnique", where);
        return getDatabase().passkeys.find(
          (key) => key.id === where.id && (!where.userID || key.userID === where.userID),
        ) ?? null;
      },
      count: async ({ where }) => {
        record("passkey.count", where);
        return getDatabase().passkeys.filter((key) => key.userID === where.userID).length;
      },
      delete: async ({ where }) => {
        record("passkey.delete", where);
        const data = getDatabase();
        const index = data.passkeys.findIndex(
          (key) => key.id === where.id && key.userID === where.userID,
        );
        if (index < 0) throw new Error("Passkey not found");
        return data.passkeys.splice(index, 1)[0];
      },
    },
    passkeyHistory: {
      deleteMany: async ({ where }) => {
        record("passkeyHistory.deleteMany", where);
        const data = getDatabase();
        const before = data.histories.length;
        data.histories = data.histories.filter((history) => {
          const passkey = data.passkeys.find((key) => key.id === history.passkeyID);
          const matchesOwner = !where.passkey || passkey?.userID === where.passkey.userID;
          return history.passkeyID !== where.passkeyID || !matchesOwner;
        });
        return { count: before - data.histories.length };
      },
    },
    prfCiphertext: {
      count: async ({ where }) => {
        record("prfCiphertext.count", where);
        return getDatabase().ciphertexts.filter(
          (entry) => entry.passkeyID === where.passkeyID && entry.userID === where.userID,
        ).length;
      },
    },
  };
}

const prisma = client(() => database, "outside");
prisma.$transaction = async (callback, options) => {
  transactions.push(options);
  const snapshot = structuredClone(database);
  const result = await callback(client(() => snapshot, "transaction"));
  if (failure === "commit") throw new Error("Simulated serialization conflict");
  database = snapshot;
  return result;
};

mock.module(new URL("../src/prisma.ts", import.meta.url), { defaultExport: prisma });
mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: { typedEnv: { NODE_ENV: "test", RP_ID: "localhost" } },
});
mock.module(new URL("../src/lib/auth/loginSession.ts", import.meta.url), {
  namedExports: { loginSessionController: { getLoginState: async () => loginState } },
});
mock.module(new URL("../src/lib/auth/reauthSession.ts", import.meta.url), {
  namedExports: {
    reauthSessionController: {
      extractSessionData: async () => {
        const data = reauthData;
        reauthData = undefined;
        return data;
      },
    },
  },
});
mock.module(new URL("../src/lib/auth/webauthnSession.ts", import.meta.url), {
  namedExports: { webauthnSessionController: {} },
});

const { default: webauthnApp } = await import("../src/routes/auth/webauthn/index.tsx");
const app = new Hono().route("/webauthn", webauthnApp);

beforeEach((t) => {
  database = {
    passkeys: [
      { id: "current-key", userID: "user-a", name: "Current" },
      { id: "target-key", userID: "user-a", name: "Target" },
      { id: "other-user-key", userID: "user-b", name: "Other user" },
    ],
    histories: [
      { id: "current-history", passkeyID: "current-key" },
      { id: "target-history-1", passkeyID: "target-key" },
      { id: "target-history-2", passkeyID: "target-key" },
      { id: "other-user-history", passkeyID: "other-user-key" },
    ],
    ciphertexts: [],
  };
  loginState = {
    state: "LOGGED_IN",
    sessionID: "session-a",
    userData: { userID: "user-a", username: "user-a", usedPasskeyID: "current-key" },
  };
  reauthData = { userId: "user-a" };
  failure = undefined;
  operations.length = 0;
  transactions.length = 0;
  t.mock.method(console, "error", () => {});
});

function deletePasskey(passkeyId = "target-key") {
  return app.request("http://localhost:3000/webauthn/delete-passkey", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passkeyId }),
  });
}

function assertNoWrites() {
  assert.equal(operations.some(({ method }) => method.endsWith("delete") || method.endsWith("deleteMany")), false);
}

for (const [label, passkeyId] of [
  ["他ユーザーのパスキー", "other-user-key"],
  ["存在しないパスキー", "missing-key"],
]) {
  test(`${label}は404で拒否し、履歴にも変更を加えない`, async () => {
    const before = structuredClone(database);
    assert.equal((await deletePasskey(passkeyId)).status, 404);
    assert.deepEqual(database, before);
    assertNoWrites();
  });
}

test("所有する対象パスキーとその履歴だけをまとめて削除する", async () => {
  const response = await deletePasskey();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    rpId: "localhost", passkeyId: "target-key", passkeyName: "Target",
  });
  assert.deepEqual(database.passkeys.map(({ id }) => id), ["current-key", "other-user-key"]);
  assert.deepEqual(database.histories.map(({ id }) => id), ["current-history", "other-user-history"]);
  assert.equal(operations.every(({ scope }) => scope === "transaction"), true);
  assert.deepEqual(transactions, [{ isolationLevel: "Serializable" }]);
});

for (const operation of ["passkey.delete", "passkeyHistory.deleteMany", "commit"]) {
  test(`${operation}の失敗ではパスキーも履歴も変更を残さない`, async () => {
    failure = operation;
    const before = structuredClone(database);
    assert.equal((await deletePasskey()).status, 500);
    assert.deepEqual(database, before);
  });
}

test("現在のログインに使ったパスキーは削除しない", async () => {
  const before = structuredClone(database);
  assert.equal((await deletePasskey("current-key")).status, 400);
  assert.deepEqual(database, before);
  assertNoWrites();
});

test("最後のパスキーは削除しない", async () => {
  database.passkeys = database.passkeys.filter(({ id }) => id !== "current-key");
  const before = structuredClone(database);
  assert.equal((await deletePasskey()).status, 400);
  assert.deepEqual(database, before);
  assertNoWrites();
});

test("暗号化データから参照されるパスキーは履歴ごと保持する", async () => {
  database.ciphertexts.push({ id: "ciphertext", passkeyID: "target-key", userID: "user-a" });
  const before = structuredClone(database);
  const response = await deletePasskey();
  assert.equal(response.status, 409);
  assert.equal((await response.json()).ciphertextCount, 1);
  assert.deepEqual(database, before);
  assertNoWrites();
});

for (const operation of ["passkey.findUnique", "passkey.count", "prfCiphertext.count"]) {
  test(`${operation}が失敗した場合は書き込みを行わない`, async () => {
    failure = operation;
    const before = structuredClone(database);
    assert.equal((await deletePasskey()).status, 500);
    assert.deepEqual(database, before);
    assertNoWrites();
  });
}

for (const [label, state, reauth] of [
  ["未ログイン", { state: "LOGGED_OUT" }, { userId: "user-a" }],
  ["再認証なし", null, undefined],
  ["別ユーザーの再認証", null, { userId: "user-b" }],
]) {
  test(`${label}では削除処理を開始しない`, async () => {
    if (state) loginState = state;
    reauthData = reauth;
    const before = structuredClone(database);
    assert.equal((await deletePasskey()).status, 401);
    assert.deepEqual(database, before);
    assert.deepEqual(operations, []);
    assert.deepEqual(transactions, []);
  });
}
