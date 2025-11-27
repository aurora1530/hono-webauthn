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

## セットアップ/ビルド/テスト手順（Build & Test）

- 要件: Node >=22.14（ホストで実行）、Docker + Docker Compose（DB/Redis 用のみ）。  
- サーバーが利用する DB/Redis はユーザー側が Docker Compose で起動。AIはこれらの起動をしない。
- 依存解決：`npm install` (既に依存がインストールされている場合はスキップ)。
- Lint/Format: `npm run biome:check` / `npm run biome:format`。

### エージェントの運用（Agent's Operation）

- 依頼ごとに作業用の git worktree を作成し、その worktree 上で作業する。作成する場合は元リポジトリと同階層の兄弟ディレクトリに置く。
- 変更は適切な論理単位でコミットする。コミットメッセージは Conventional Commits 形式のプレフィックス（例: `feat:`, `fix:`, `chore:`, `docs:`）を付け、日本語で要約を書く。
- ファイルを移動する際は必ず `git mv` を使用する。
- エージェントは、コード変更後、品質チェック（例: `npm run biome:check`）を実行しますが、`npm run build`のような時間のかかるビルドコマンドや、システム状態を大きく変更する可能性のあるコマンドは、ユーザーからの明示的な指示がない限り自動では実行しません。これらのコマンドの実行が必要な場合は、ユーザーにその旨を伝え、確認を求めます。
- Biome の指摘でタスクと無関係なものは無視してよい。

## メンテナンス_ポリシー（Maintenance policy）

- 会話の中で繰り返し指示されたことがある場合は反映を検討すること
- 冗長だったり、圧縮の余地がある箇所を検討すること
- 簡潔でありながら密度の濃い文書にすること
