# VibeStadium

A real-time, AI-narrated stadium companion that turns crowd chaos into calm, confident movement. Fans get live zone density, A* pathfinding routes, bin reporting with rewards, last-mile transit options, and an AI assistant — all working offline/in mock mode with zero API keys needed.

## Run & Operate

- `pnpm --filter @workspace/vibe-stadium run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Zustand, Framer Motion, Radix UI / shadcn, Tailwind CSS
- API: Express 5 + Zod validation
- DB: PostgreSQL + Drizzle ORM (rewards ledger, bin reports)
- Validation: Zod everywhere (client + server)
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle for API server)

## Where things live

- `artifacts/vibe-stadium/src/pages/` — MapPage, AssistantPage, RewardsPage, TransitPage, OpsPage
- `artifacts/vibe-stadium/src/components/` — AIBanner, AppShell
- `artifacts/vibe-stadium/src/store/` — Zustand store (stepFreeOnly toggle, mock simulation)
- `artifacts/api-server/src/lib/` — stadiumData.ts (zone graph), pathfinding.ts (A*), narrator.ts (mock AI), binsData.ts, rewardsData.ts, transitData.ts
- `artifacts/api-server/src/routes/` — zones, route, bins, rewards, transit, narrate, stats
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — bins.ts, rewards.ts Drizzle schemas

## Architecture decisions

- **Deterministic core, generative shell:** Pathfinding (A*) and crowd math run as real algorithms; the AI narrator layer only narrates over computed state — it never invents numbers.
- **In-memory zone simulation:** Zone density drifts in-memory every 8 seconds (server-side `setInterval`), frontend also simulates with Zustand for immediate feel.
- **Mock AI narration:** Template-based narrator parameterized by live zone state — varied text with no hardcoded strings. Swap in a real LLM by implementing the `AIProvider` interface in `narrator.ts`.
- **Offline-first fallback:** MOCK_ZONES defined client-side match the API coordinate space; map is never empty even when API is down.
- **Step-free routing:** A* skips edges with `hasStairs: true` when `stepFreeOnly` flag is set; falls back to Dijkstra (same code, inadmissible heuristic handled by relaxed weighting).
- **Rewards are DB-backed:** Credits ledger in PostgreSQL via Drizzle, idempotent inserts — bin reporting is best-effort but credits are durable.

## Product

Five core sections accessible via sidebar (desktop) / bottom nav (mobile):
1. **Map** — SVG stadium zone graph with live density heat coloring, click-to-route, animated route path, step-free toggle, AI banner narration
2. **Assistant** — Chat-style AI co-pilot, urgency escalation (normal/elevated/emergency), voice input button (Web Speech API)
3. **Rewards** — Credits wallet backed by DB, transaction ledger, claimable offers (food/merch/upgrade/experience)
4. **Transit** — Last-mile options (rideshare/bus/rail/walk) with M/M/c queue-estimated wait times, staggered exit plan
5. **Ops Console** — Staff view (Ctrl+Shift+O), per-zone capacity sliders, alert feed, density history charts

## User preferences

_Populate as you build._

## Gotchas

- After any OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen` then `pnpm run typecheck:libs` before touching route files.
- Zone SVG coordinates are in an 800×620 pixel space — keep `viewBox="0 0 800 620"` on the map SVG.
- The API server builds to `dist/` via esbuild before running — changes require a rebuild (`pnpm --filter @workspace/api-server run build`) or a workflow restart which rebuilds automatically.
- `zustand` must be in `artifacts/vibe-stadium/package.json` devDependencies (not in the pnpm catalog).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
