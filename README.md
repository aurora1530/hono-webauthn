# Hono WebAuthn Demo App

## Deployed

The demo app is deployed at: https://hono-webauthn-demo-app.onrender.com

We use Upstash for Redis and Supabase for Postgres.

## Setup

You have to have Docker and Docker Compose installed.

Before running the container, make sure to set these environment variables in a `.env` file:

```txt
SIGNED_COOKIE_SECRET=your_secret_key_here
POSTGRES_USER=postgres_user_here
POSTGRES_PASSWORD=postgres_password_here
POSTGRES_DB=postgres_db_name_here
DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public"
REDIS_URL="redis://redis:6379"
```

then run:

```bash
docker compose up
docker compose exec app bash
```

on the container, run:

```bash
npm run build:db && npm run deploy:migrate
npm run dev
```

Then open `http://localhost:3000` in your browser.

## LICENSE

MIT License
