# swas-fruit-market

Hobby farm fruit stock & booking app. See [PRD](../PRD_Fruit_Stock_App.md) for full spec.

## Stack

- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (Postgres + Storage)
- Deployed on Vercel

## Setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase keys + AUTH_JWT_SECRET
```

### 1. Provision Supabase

1. Create a Supabase project.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor.
3. Generate an owner password hash and replace the placeholder seed row:
   ```bash
   node scripts/hash-password.mjs "my-owner-password"
   ```
   Update the owner row via SQL:
   ```sql
   update admin_users set password_hash = '$2a$10$...' where role = 'owner';
   ```

### 2. Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon (used for public reads only) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side writes + auth |
| `AUTH_JWT_SECRET` | 32-byte random hex for session JWTs |

### 3. Run

```bash
npm run dev
```

## Milestones

Tracked in [PRD §8](../PRD_Fruit_Stock_App.md). Current status:

- [x] **M1 Foundation** — scaffold, schema, auth middleware, login
- [x] **M2 Public view** — 2-col mobile / 4-col tablet+, ISR + 20s polling, LINE footer, fruit detail page
- [ ] **M3 Admin core** — catalogue, weekly stock, user management, settings
- [ ] **M4 Bookings & checkout** — save-time stock validation, receipts, booking↔receipt linkage
- [ ] **M5 History & polish** — CSV export, offline toasts, Thai copy review
