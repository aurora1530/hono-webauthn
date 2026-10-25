import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { after, test } from "node:test";
import { serveStatic } from "@hono/node-server/serve-static";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoCBOR } from "@simplewebauthn/server/helpers";
import { Hono } from "hono";
import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";

const rpID = "localhost";
const origin = "http://localhost:3000";
const hash = (value) => createHash("sha256").update(value).digest();
const encode = (value) => Buffer.from(value).toString("base64url");
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = publicKey.export({ format: "jwk" });
const coseKey = isoCBOR.encode(new Map([
  [1, 2], [3, -7], [-1, 1],
  [-2, new Uint8Array(Buffer.from(jwk.x, "base64url"))],
  [-3, new Uint8Array(Buffer.from(jwk.y, "base64url"))],
]));
const credentialId = Buffer.from("dependency-compatibility-key");
const id = encode(credentialId);

test("更新後のライブラリでnone attestationの登録応答を検証できる", async () => {
  const options = await generateRegistrationOptions({ rpName: "Test", rpID, userName: "test" });
  const idLength = Buffer.alloc(2);
  idLength.writeUInt16BE(credentialId.length);
  const authData = Buffer.concat([
    hash(rpID), Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16),
    idLength, credentialId, coseKey,
  ]);
  const attestation = isoCBOR.encode(new Map([
    ["fmt", "none"], ["attStmt", new Map()], ["authData", new Uint8Array(authData)],
  ]));
  const result = await verifyRegistrationResponse({
    response: {
      id, rawId: id, type: "public-key", clientExtensionResults: {},
      response: {
        clientDataJSON: encode(JSON.stringify({ type: "webauthn.create", challenge: options.challenge, origin })),
        attestationObject: encode(attestation),
      },
    },
    expectedChallenge: options.challenge, expectedOrigin: origin, expectedRPID: rpID,
  });
  assert.equal(result.verified, true);
  assert.equal(result.registrationInfo.credential.id, id);
  assert.deepEqual(result.registrationInfo.credential.publicKey, coseKey);
});

async function authenticationFixture() {
  const options = await generateAuthenticationOptions({ rpID });
  const clientData = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge: options.challenge, origin }));
  const counter = Buffer.alloc(4);
  counter.writeUInt32BE(1);
  const authenticatorData = Buffer.concat([hash(rpID), Buffer.from([0x05]), counter]);
  return {
    response: {
      id, rawId: id, type: "public-key", clientExtensionResults: {},
      response: {
        clientDataJSON: encode(clientData), authenticatorData: encode(authenticatorData),
        signature: encode(sign("sha256", Buffer.concat([authenticatorData, hash(clientData)]), privateKey)),
      },
    },
    expectedChallenge: options.challenge, expectedOrigin: origin, expectedRPID: rpID,
    credential: { id, publicKey: new Uint8Array(coseKey), counter: 0 },
  };
}

test("更新後のライブラリで実際のES256認証署名を検証できる", async () => {
  const result = await verifyAuthenticationResponse(await authenticationFixture());
  assert.equal(result.verified, true);
  assert.equal(result.authenticationInfo.newCounter, 1);
});

for (const [field, value] of [
  ["expectedChallenge", "wrong-challenge"], ["expectedOrigin", "https://other.example"],
  ["expectedRPID", "other.example"],
]) {
  test(`認証の${field}が一致しない場合は拒否する`, async () => {
    const fixture = await authenticationFixture();
    await assert.rejects(verifyAuthenticationResponse({ ...fixture, [field]: value }));
  });
}

test("認証署名の改ざんを拒否する", async () => {
  const fixture = await authenticationFixture();
  const signature = Buffer.from(fixture.response.response.signature, "base64url");
  signature[signature.length - 1] ^= 1;
  fixture.response.response.signature = encode(signature);
  assert.equal((await verifyAuthenticationResponse(fixture)).verified, false);
});

const secret = "dependency-test-cookie-secret-".repeat(2);
const cookieApp = new Hono();
cookieApp.get("/set", async (c) => {
  await setSignedCookie(c, "session", "session-a", secret, { httpOnly: true, sameSite: "Lax", path: "/" });
  return c.text("ok");
});
cookieApp.get("/read", async (c) => {
  const value = await getSignedCookie(c, secret, "session");
  return c.text(value === "session-a" ? "accepted" : "rejected");
});

test("署名Cookieの往復と改ざん拒否を維持する", async () => {
  const response = await cookieApp.request(`${origin}/set`);
  const header = response.headers.get("Set-Cookie");
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/i);
  const cookie = header.split(";")[0];
  assert.equal(await (await cookieApp.request(`${origin}/read`, { headers: { Cookie: cookie } })).text(), "accepted");
  assert.equal(await (await cookieApp.request(`${origin}/read`, { headers: { Cookie: cookie.replace("session-a", "session-b") } })).text(), "rejected");
});

test("同一OriginのJSON POSTを許可し、別Originのフォーム送信を拒否する", async () => {
  const app = new Hono();
  app.use(secureHeaders({ xFrameOptions: "DENY" }));
  app.use(csrf());
  app.post("/action", (c) => c.text("ok"));
  const allowed = await app.request(`${origin}/action`, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: "{}",
  });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("X-Frame-Options"), "DENY");
  const denied = await app.request(`${origin}/action`, {
    method: "POST", headers: { Origin: "https://other.example", "Content-Type": "application/x-www-form-urlencoded" }, body: "a=b",
  });
  assert.equal(denied.status, 403);
});

const fixtureRoot = mkdtempSync(join(tmpdir(), "sr08-static-"));
after(() => {
  assert.equal(dirname(fixtureRoot), tmpdir().replace(/[\\/]$/, ""));
  rmSync(fixtureRoot, { recursive: true });
});
mkdirSync(join(fixtureRoot, "public", "private"), { recursive: true });
writeFileSync(join(fixtureRoot, "public", "asset.txt"), "public asset");
writeFileSync(join(fixtureRoot, "public", "private", "secret.txt"), "protected fixture");
const staticApp = new Hono();
staticApp.use("/public/private/*", (c) => c.text("denied", 401));
staticApp.get("/public/*", serveStatic({ root: relative(process.cwd(), fixtureRoot).split(sep).join("/") }));

test("公開ファイルは配信し、保護対象は認可を要求する", async () => {
  const response = await staticApp.request(`${origin}/public/asset.txt`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "public asset");
  assert.equal((await staticApp.request(`${origin}/public/private/secret.txt`)).status, 401);
});

for (const path of ["/public/private%2Fsecret.txt", "/public/private%5Csecret.txt", "/public//private/secret.txt"]) {
  test(`静的配信で区切り文字を細工しても保護対象を取得できない: ${path}`, async () => {
    const response = await staticApp.request(`${origin}${path}`);
    assert.ok([401, 404].includes(response.status));
    assert.notEqual(await response.text(), "protected fixture");
  });
}
