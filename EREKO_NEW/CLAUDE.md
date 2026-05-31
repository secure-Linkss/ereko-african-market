@AGENTS.md

# EREKO Project — Claude Code Notes

## Payment Testing (Stripe)

Stripe test keys are set in Vercel env vars. Do NOT commit to git.

**Test cards** (use any future expiry + any CVC):
- `4242 4242 4242 4242` — Payment succeeds
- `4000 0000 0000 9995` — Declined (insufficient funds)
- `4000 0025 0000 3155` — Requires 3D Secure authentication
- `4000 0000 0000 0259` — Creates chargeback dispute

**Publishable key (safe to reference here):**
`pk_test_51TK2lpJvp7F8yAeKfEEkDCyxsLz37BEGKwjp8GxbYDfZeruSHCdCrtjDnZFWJyMmbf7dISQEwaEtYHBNPghsPmIH00qn7ZLyOg`

**To QA payment flow:**
1. Add item to cart → checkout → use test card above
2. Verify webhook events via Stripe Dashboard → Events
3. Use `stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe` for local dev
4. Full Stripe API docs: https://stripe.com/docs/api
5. Secret key and webhook secret are in Vercel env vars ONLY (never in code)

## Arch Notes
- Frontend: Next.js App Router, next-intl, TanStack Query, Zustand, Tailwind, shadcn
- Backend: NestJS + Supabase (Postgres), deployed as separate Vercel project
- API rewrite: frontend `/api/v1/*` → `api-ereko-market.vercel.app/api/v1/*` via vercel.json
- Admin: `/en-gb/admin` — requires isAdmin=true in JWT
- Notifications: `readAt` field (not `isRead`) — always use `.is('readAt', null)` for unread filter
