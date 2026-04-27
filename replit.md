# TUANANHPROXY

Vietnamese Free Fire proxy service e-commerce site (clone-styled after deltaproxyvn.lol but rebranded entirely as TUANANHPROXY).

## Architecture
Monorepo (pnpm workspaces) with:
- `artifacts/tuananhproxy` — React + Vite frontend (gaming-blue theme, Vietnamese UI, mobile-first)
- `artifacts/api-server` — Express API server (port 21782 routed via `/api`)
- `lib/db` — Drizzle ORM + Postgres schema
- `lib/api-spec` — OpenAPI 3 spec (single source of truth)
- `lib/api-zod` — generated Zod schemas
- `lib/api-client-react` — generated Orval React Query hooks
- `lib/api-types` — generated shared TS types

## Features
- Public catalog: 4 categories × 10 products (Aim Cổ Antenna, AimDrag No Antenna, Aim Body Xoá Máu Vàng, Sỉ key SLL).
- Auth: register/login/logout via cookie session (`tap_sid`, httpOnly, 30 days). bcrypt password hashes.
- Customer deposit flow: user submits deposit request → admin approves → balance credited and 20% referral commission paid to referrer if any.
- Customer purchase flow: order deducts balance, decrements stock, creates a unique `KEY-...` code.
- Affiliate referral system: each user has a referralCode + shareable link `/dang-ky?ref=CODE`. 20% commission of approved deposits credited to referrer.
- Admin panel (`/admin`): stats overview, user balance adjust (add/subtract with reason), deposit approve/reject, product CRUD.
- Floating Zalo chat button (0339651811) and mobile bottom nav.

## Admin credentials
- Username: `0339651811`
- Password: `tuananh2011@`

Auto-seeded on API startup if absent.

## Bank/QR
QR code at `/qr-payment.jpeg` (LUONG TUAN ANH 0339651811).

## Database
Postgres via `DATABASE_URL`. Tables: users, sessions, categories, products, orders, deposits, transactions, referral_commissions. Run `pnpm --filter @workspace/db run push` after schema changes.

## Codegen
After editing `lib/api-spec/openapi.yaml`:
```
pnpm --filter @workspace/api-spec run codegen
```
This regenerates Zod, types, and React hooks for all consumers.

## Workflows
- `artifacts/api-server: API Server` — Express on `/api`
- `artifacts/tuananhproxy: web` — Vite dev server on `/`

## Notes
- Free tier: only one artifact, web app only.
- Numeric monetary columns are PG numeric; always coerce with `Number()` and write with `.toFixed(2)`.
- Referral rate is hard-coded at 20% (`REFERRAL_RATE = 0.2` in `routes/admin.ts`).
- Product card images are inline SVGs in `artifacts/tuananhproxy/public/product-*.svg` so no `deltaproxy*` branding leaks via images.
