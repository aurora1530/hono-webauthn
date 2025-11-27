# Hono WebAuthn Demo App

## Deployed

The demo app is deployed at: https://hono-webauthn-demo-app.onrender.com

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
```

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

## Project layout (excerpt)

- `src/features/<name>/server` — Hono routes & server-side logic (e.g., auth, profile)
- `src/features/<name>/client` — Browser entrypoints/components (bundled by esbuild)
- `src/shared` — Cross-cutting contract/UI/infra (prisma client, design tokens, RPC types)
- `src/components` — SSR UI components used by server routes (existing structure)

## Build & watch

- Server: `npm run build:server` / `npm run dev:server`
- Client: `npm run build:client` / `npm run watch:client`

Client entrypoints live in `src/features/*/client/entries/*.ts(x)` and use `tsconfig.client.json`.

## LICENSE

MIT License
