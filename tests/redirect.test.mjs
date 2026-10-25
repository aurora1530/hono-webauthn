import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { Hono } from "hono";
import {
  buildLoginRedirectUrl,
  extractRedirectPath,
  sanitizeRedirectPath,
} from "../src/lib/auth/redirect.ts";

const origin = "https://app.example";
const unsafePaths = [
  ["バックスラッシュ", "/\\evil.example"],
  ["複数バックスラッシュ", "/\\\\evil.example"],
  ["スキーム相対URL", "//evil.example"],
  ["絶対URL", "https://evil.example/"],
  ["JavaScript URL", "javascript:alert(1)"],
  ["相対パス", "profile"],
  ["タブ", "/\t/evil.example"],
  ["改行", "/\n/evil.example"],
  ["CRLF", "/profile\r\nLocation: https://evil.example"],
  ["NULL文字", "/profile\0"],
  ["DEL文字", "/profile\x7f"],
  ["正規化後に先頭が二重スラッシュになるパス", "/account/..//evil.example"],
  ["エンコードされたドットセグメント", "/%2e//evil.example"],
  ["長さ上限超過", `/${"a".repeat(2000)}`],
];

for (const [label, value] of unsafePaths) {
  test(`${label}を拒否する`, () => {
    assert.equal(sanitizeRedirectPath(value), undefined);
    const request = new Request(`${origin}/auth/login?${new URLSearchParams({ redirect: value })}`);
    assert.equal(extractRedirectPath(request), undefined);
  });
}

for (const [value, expected] of [
  ["/", "/"],
  ["/profile?tab=passkeys#latest", "/profile?tab=passkeys#latest"],
  ["/account/../profile", "/profile"],
  ["/profile?next=https%3A%2F%2Fevil.example", "/profile?next=https%3A%2F%2Fevil.example"],
  ["/%2F%5Cevil.example", "/%2F%5Cevil.example"],
  ["/日本語", "/%E6%97%A5%E6%9C%AC%E8%AA%9E"],
  [`/${"a".repeat(1999)}`, `/${"a".repeat(1999)}`],
]) {
  test(`安全なパスを正規化する: ${value.slice(0, 50)}`, () => {
    const result = sanitizeRedirectPath(value);
    assert.equal(result, expected);
    assert.equal(new URL(result, origin).origin, origin);
  });
}

test("未指定・空のリダイレクトを拒否する", () => {
  for (const value of [undefined, null, ""]) assert.equal(sanitizeRedirectPath(value), undefined);
  assert.equal(extractRedirectPath(new Request(`${origin}/auth/login`)), undefined);
});

test("ログインURLに元のパスとクエリーを往復できる形で保存する", () => {
  const result = buildLoginRedirectUrl(new Request(`${origin}/profile?tab=passkeys&name=a%26b`));
  assert.equal(new URL(result, origin).pathname, "/auth/login");
  assert.equal(extractRedirectPath(new Request(new URL(result, origin))), "/profile?tab=passkeys&name=a%26b");
});

test("危険な元パスではログインURLの戻り先を設定しない", () => {
  assert.equal(buildLoginRedirectUrl(new Request(`${origin}//evil.example`)), "/auth/login");
});

mock.module(new URL("../src/env.ts", import.meta.url), {
  namedExports: { typedEnv: { NODE_ENV: "test", RP_ID: "localhost" } },
});
mock.module(new URL("../src/prisma.ts", import.meta.url), { defaultExport: {} });
mock.module(new URL("../src/lib/auth/loginSession.ts", import.meta.url), {
  namedExports: {
    loginSessionController: {
      getLoginState: async () => ({ state: "LOGGED_IN", userData: { userID: "user-a" } }),
    },
  },
});
mock.module(new URL("../src/lib/auth/webauthnSession.ts", import.meta.url), {
  namedExports: { webauthnSessionController: {} },
});
mock.module(new URL("../src/routes/auth/webauthn/index.tsx", import.meta.url), {
  defaultExport: new Hono(),
});
mock.module(new URL("../src/client/lib/rpc/webauthnClient.ts", import.meta.url), {
  namedExports: {
    webauthnClient: {
      authentication: {
        generate: { $get: async () => ({ ok: true, json: async () => ({}) }) },
        verify: { $post: async () => ({ ok: true }) },
      },
    },
  },
});
mock.module(new URL("../src/client/lib/webauthn/webauthnAbort.ts", import.meta.url), {
  namedExports: {
    createAbortController: () => ({ getSignal: () => new AbortController().signal }),
    handleWebAuthnAbort: () => false,
  },
});
mock.module(new URL("../src/client/components/common/StatusToast.tsx", import.meta.url), {
  namedExports: { showStatusToast: () => assert.fail("Unexpected authentication error") },
});

const { default: authApp } = await import("../src/routes/auth/index.tsx");
const app = new Hono().route("/auth", authApp);
const { handleAuthentication } = await import("../src/client/lib/webauthn/authentication.ts");

for (const [label, value] of unsafePaths) {
  test(`ログイン済みルートでも${label}を外部へリダイレクトしない`, async () => {
    const response = await app.request(`${origin}/auth/login?${new URLSearchParams({ redirect: value })}`);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), "/");
  });
}

test("ログイン済みルートは正常な戻り先のクエリーとフラグメントを保持する", async () => {
  const response = await app.request(`${origin}/auth/login?${new URLSearchParams({ redirect: "/profile?tab=passkeys#latest" })}`);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "/profile?tab=passkeys#latest");
});

for (const value of ["/\\evil.example", "/account/..//evil.example", "/\t/evil.example", "/profile?tab=passkeys#latest"]) {
  test(`クライアントのログイン後も同一オリジンへ戻す: ${JSON.stringify(value)}`, async (t) => {
    const location = { origin, search: `?${new URLSearchParams({ redirect: value })}`, href: "" };
    class AssertionResponse {
      clientDataJSON = new Uint8Array([0]).buffer;
      authenticatorData = new Uint8Array([0]).buffer;
      signature = new Uint8Array([0]).buffer;
      userHandle = null;
    }
    class TestCredential {
      static parseRequestOptionsFromJSON(options) { return options; }
      id = "AA";
      rawId = new Uint8Array([0]).buffer;
      response = new AssertionResponse();
      authenticatorAttachment = null;
      getClientExtensionResults() { return {}; }
    }
    const globals = {
      window: { location },
      location,
      navigator: { credentials: { get: async () => new TestCredential() } },
      PublicKeyCredential: TestCredential,
      AuthenticatorAssertionResponse: AssertionResponse,
    };
    for (const [name, value] of Object.entries(globals)) {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
      Object.defineProperty(globalThis, name, { configurable: true, value });
      t.after(() => {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      });
    }
    t.mock.method(console, "log", () => {});
    await handleAuthentication();
    assert.equal(location.href, value.startsWith("/profile?") ? value : "/");
    assert.equal(new URL(location.href, origin).origin, origin);
  });
}
