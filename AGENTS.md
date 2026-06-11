# Repository Guidelines

## Project Structure & Module Organization
`src/app` contains the Next.js App Router surface. Use `src/app/(dashboard)` for pages such as `/dashboard`, `/signals`, and `/trading`, and `src/app/api` for route handlers. Put reusable UI in `src/components`, with shared primitives in `src/components/ui`, dashboard-specific flows in `src/components/dashboard`, and layout chrome in `src/components/layout`. Core logic lives in `src/lib` (`strategy/`, `hooks/`, `security/`, `dashboard/`, `validation/`). Prisma schema and migrations are under `prisma/`; static assets and PWA files live in `public/`.

## Build, Test, and Development Commands
- `pnpm dev` — run the local Next.js dev server.
- `pnpm build` — generate the Prisma client, then create the production build.
- `pnpm start` — serve the built app.
- `pnpm lint` — run ESLint with Next.js and TypeScript rules.
- `pnpm db:generate | db:migrate | db:deploy | db:studio` — Prisma client, migration, deploy, and Studio workflows.

## Coding Style & Naming Conventions
Use TypeScript and existing 2-space indentation. Components, providers, and route files follow PascalCase exports where appropriate (`TradingPageContent.tsx`, `SignalFlowRail.tsx`); hooks start with `use`; utility files in `src/lib` usually use kebab-case (`wallet-config.ts`, `sodex-perps.ts`). Prefer the `@/` import alias over long relative paths. Keep Tailwind utility clusters readable and colocate route-specific UI with the feature it serves.

## Testing Guidelines
There is currently no dedicated `pnpm test` script. Treat `pnpm lint` and `pnpm build` as the minimum validation gate for every change. When touching strategy logic, wallet flows, or API handlers, do focused regression checks on the affected routes and endpoints, especially `/dashboard`, `/signals`, `/trading`, and the matching `src/app/api/*` handler.

## Commit & Pull Request Guidelines
Recent history uses conventional, scoped subjects such as `feat(dashboard): ...`, `refactor(layout): ...`, and `feat(orderbook): ...`. Keep commits imperative and tightly scoped. PRs should summarize behavior changes, list affected routes or API endpoints, call out Prisma or environment changes, and include screenshots for visible UI updates.

## Security & Framework Notes
Do not commit secrets, API keys, wallet credentials, or `.env` files. Live execution remains security-gated in this repo, so keep read-only and write-capable flows labeled accurately. This project runs on Next.js `16.2.4`; before changing framework-level patterns, read the relevant docs in `node_modules/next/dist/docs/` and heed deprecation notices.
