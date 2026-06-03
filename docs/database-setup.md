# Database Setup

SignalFlow uses Prisma ORM with a Postgres database. Supabase Postgres is the recommended host because it is fast to provision and still gives us a normal Postgres connection for Prisma migrations.

## Environment

Set these variables in local development and Vercel:

```bash
DATABASE_URL="postgresql://postgres.project-ref:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.project-ref:password@aws-0-region.pooler.supabase.com:5432/postgres"
```

Use `DATABASE_URL` for runtime/serverless traffic. Use `DIRECT_URL` for Prisma migrations. If your environment can reach Supabase's direct database host, that direct URL also works for `DIRECT_URL`; otherwise use the Supabase Session Pooler on port `5432`.

## Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:studio
```

Run `pnpm db:migrate` locally after the Supabase URLs are set. Run `pnpm db:deploy` in production deployment flows.

## First Tables

- `WalletProfile`: one profile per wallet address.
- `StrategyConfig`: selectable strategy configs, including Confluence and Liquidity Flow.
- `SignalHistory`: generated signals and outcomes.
- `PaperAccount`, `PaperPosition`, `TradeJournal`: wallet-owned paper/live trading records.
- `BacktestRun`: strategy comparison snapshots.

The first route using the DB is `POST /api/wallet-profile`, which upserts a wallet profile and creates a paper account shell.
