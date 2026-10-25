# Hono WebAuthn Demo App

## Deployed

The demo app is deployed at: https://passkey-demo-app.aurora1530.dev

We use Upstash for Redis and Supabase for Postgres.

## Setup

You have to have Docker and Docker Compose installed for Postgres/Redis, and Node (>=22.14) on your host for the app.

Create a `.env` file on your host with:

```txt
SIGNED_COOKIE_SECRET=your_secret_key_here
POSTGRES_USER=postgres_user_here
POSTGRES_PASSWORD=postgres_password_here
POSTGRES_DB=postgres_db_name_here
POSTGRES_PORT=5432
REDIS_PORT=6379
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
REDIS_URL="redis://localhost:${REDIS_PORT}"
RATE_LIMIT_WINDOW_SEC=60
RATE_LIMIT_MAX_REQUESTS=120
RATE_LIMIT_TRUSTED_PROXIES=
```

`RATE_LIMIT_WINDOW_SEC` と `RATE_LIMIT_MAX_REQUESTS` は省略可能で、未指定時はそれぞれ 60 秒・120 リクエストの上限になります。

レート制限は接続元 IP 単位で適用し、ログイン済みの場合はユーザー単位の上限も併用します。`/auth/*` と `/profile/*` はカウンターを共有します。上限超過は `429`、Redis 障害などで制限を確認できない場合は `503` を返します。

`RATE_LIMIT_TRUSTED_PROXIES` の既定値は空で、転送ヘッダーを信頼しません。プロキシを使う場合は、管理・確認できるプロキシの IP または CIDR をカンマ区切りで指定してください。例えば、自分で管理するローカルプロキシだけを経由する場合は `127.0.0.1,::1` とします。無効な値は起動時に拒否します。

接続元が指定範囲に含まれる場合に限り、`X-Forwarded-For` を右からたどって最初の非信頼 IP を使用します。プロキシは実際の接続元をこのヘッダーへ追記または上書きする必要があります。`X-Real-IP`、`Forwarded`、`User-Agent` は識別に使いません。全 IP や、無関係なサービスも含む範囲を信頼する設定は避けてください。

Render へのデプロイ時も、実際の経路とプロキシ範囲を確認して設定してください。このリポジトリでは Render の範囲を固定していません。未設定ならプロキシ IP ごとの制限となるため、複数の利用者が同じ上限を共有する可能性があります。[Render のクライアント IP に関する説明](https://render.com/articles/how-render-handles-ddos-attacks)

ログイン状態の確認では Redis のセッションに加え、認証に使ったパスキーの存在と所有者を毎回 DB で照合します。パスキー削除後はそのパスキーで作った全セッションを、アカウント削除後はそのユーザーの全セッションを、次の認証確認から拒否します。ログイン情報はプロセス内にキャッシュしません。

削除対象の Redis セッションはアクセス時または通常の TTL（7 日）で消去するため、削除直後に全件を物理削除する方式ではありません。認証確認の DB 読み取りが増え、DB・Redis 障害時は過去の認証結果を使って処理を続けません。

リクエスト本文は実際に読み取った量で 64 KiB に制限し、超過時は JSON パースや認証の前に `413` を返します。WebAuthn 応答も構造・Base64URL・各フィールド長を検証します（attestation はエンコード済みで最大 48 KiB、clientDataJSON・認証器データ・署名などは各 4096 文字）。

PRF データの保存枠はユーザーごとに最大 100 件・文字列データ合計 256 KiB です。暗号文、IV、タグ、PRF 入力、ラベル、関連データの UTF-8 バイト数を合算し、DB の行・インデックス等の容量は含めません。上限超過や保存競合は `409` を返し、既存データを削除すると枠を再利用できます。保存枠の確認と書き込みは同じ Serializable トランザクションで行います。既に枠を超えているデータは自動削除せず、新規保存だけを拒否します。

パスキー管理画面では各パスキーの最新履歴 1 件だけを取得します。履歴一覧は 1 ページ最大 100 件・最大 1000 ページ、ID を指定する履歴削除は 1 回最大 100 件です。リソース制限の回帰テストは `npm run test:resource-limits` で実行できます。

then start only the data services:

```bash
docker compose up -d
```

Back on your host shell:

```bash
npm run build:db && npm run deploy:migrate
npm run dev
```

Then open `http://localhost:3000` in your browser.

## LICENSE

MIT License
