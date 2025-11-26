# リポジトリガイドライン

## プロジェクト概要（Overview）

Hono と WebAuthn を組み合わせたフルスタック認証デモ。Render でのデプロイとローカル検証を想定し、実装例・学習用サンプルとして利用する。

## コーディング規約（Coding Style Guidelines）

- 言語は TypeScript（ESM）。Async/await を基本とし、ドメイン型は `PascalCase`、変数/関数は `camelCase`。  
- Lint/Format は Biome (`npm run biome:check` / `npm run biome:format`) に統一し、lint-staged+husky でコミット前に実行。  
- サーバーは Hono、データアクセスは Prisma 経由で行い、入力・レスポンスバリデーションに zod を用いる。  
- 複雑な処理のみ短いコメントを付与し、意味の重複する冗長コメントは避ける。

## セキュリティ（Security considerations）

- `.env` に認証情報（SIGNED_COOKIE_SECRET、DATABASE_URL、REDIS_URL など）を置き、リポジトリにコミットしない。dotenvx でローカルのみ読み込む。  
- WebAuthn はセキュアオリジン前提。SIGNED_COOKIE_SECRET は十分長い乱数を使用し、機密情報をログに残さない。  
- すべての外部入力は zod で検証し、Prisma 経由でパラメータ化して SQL インジェクションを防ぐ。  
- 依存更新時は `npm audit` で既知脆弱性を確認し、不要な権限を持つサービスアカウントを作らない。

## ビルド＆テスト手順（Build & Test）

- 要件: Node >=22.14（ホストで実行）、Docker + Docker Compose（DB/Redis 用のみ）。  
- セットアップ: `.env` を用意し、`docker compose up -d` で Postgres/Redis を起動。以降のコマンドはホストのシェルで実行する。  
- DB & マイグレーション: `npm run build:db && npm run deploy:migrate`。  
- 開発サーバー: `npm run dev`（client バンドル watch + Hono サーバー）。  
- 本番ビルド: `npm run build`。品質チェック: `npm run biome:check`。自動テストは未整備のため、動作確認はブラウザ経由で行う。
- 通常、開発環境で `npm run build` は実行しない。

### エージェントの運用（Agent's Operation）

エージェントは、コード変更後、品質チェック（例: `npm run biome:check`）を実行しますが、`npm run build`のような時間のかかるビルドコマンドや、システム状態を大きく変更する可能性のあるコマンドは、ユーザーからの明示的な指示がない限り自動では実行しません。これらのコマンドの実行が必要な場合は、ユーザーにその旨を伝え、確認を求めます。

## メンテナンス_ポリシー（Maintenance policy）

- 会話の中で繰り返し指示されたことがある場合は反映を検討すること
- 冗長だったり、圧縮の余地がある箇所を検討すること
- 簡潔でありながら密度の濃い文書にすること
