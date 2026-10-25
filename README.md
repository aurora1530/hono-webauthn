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
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${POSTGRES_DB}?schema=public"
REDIS_URL="redis://127.0.0.1:${REDIS_PORT}"
RATE_LIMIT_WINDOW_SEC=60
RATE_LIMIT_MAX_REQUESTS=120
RATE_LIMIT_TRUSTED_PROXIES=
```

Compose の DB・Redis はホストの `127.0.0.1` にのみポートを公開します。`POSTGRES_PORT`・`REDIS_PORT` ではポート番号だけを変更でき、公開先 IP は固定です。接続 URL も IPv4 の `127.0.0.1` を指定してください。Redis はこのローカル開発構成では認証を設定していないため、ホスト上の他プロセスや同じ Compose ネットワークのコンテナーからはアクセスできます。共有・遠隔利用には認証・TLS・ネットワーク制限を別途設定してください。

Docker Engine 28.0.0 未満には、localhost に公開したポートへ同一 L2 ネットワークから到達できる既知の問題があります。28.0.0 以上を使用してください。[Docker のポート公開に関する説明](https://docs.docker.com/engine/network/port-publishing/)

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

既に起動済みの場合も、設定変更後に `docker compose up -d db redis` を実行してコンテナーを再作成してください。`docker compose restart` だけではポート設定は反映されません。DB の名前付きボリュームは保持されますが、Redis の永続化はこの Compose では設定していないため、再作成で既存のログイン・認証途中のセッションが失われる可能性があります。

Back on your host shell:

```bash
npm run build:db && npm run deploy:migrate
npm run dev
```

Then open `http://localhost:3000` in your browser.

ログアウトは画面の POST フォームから実行します。`GET /auth/logout` は 404 となり、ログアウトしません。POST は本文形式によらず、Origin がリクエスト URL と一致する場合だけ許可します。Origin がない場合は `Sec-Fetch-Site: same-origin` を要求し、不一致・不明な送信元は 403 で拒否します。プロキシはこれらのヘッダーを保持してください。正常時はログインセッションと Cookie を破棄し、303 でトップへ戻ります。回帰テストは `npm run test:logout` で実行できます。

## Dependency maintenance

依存関係は `npm ci` で lockfile どおりにインストールし、更新時は `npm audit` と `npm audit --omit=dev` の両方を確認してください。認証・署名 Cookie・CSRF・静的配信の依存互換性テストは `npm run test:dependency-compatibility` で実行できます。

`Dockerfile.app.prod` はビルド用と実行用の依存を分離します。実行用ステージだけで開発依存・スクリプトを manifest から除き、任意 peer 依存もインストールしません。Prisma CLI や TypeScript 等の開発ツールを含めず、ビルド時に生成した Prisma Client とクエリーエンジンを引き継ぎます。マイグレーションは従来どおり CI で実施します。

## LICENSE

MIT License
