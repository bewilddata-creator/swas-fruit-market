# Product Requirements Document
## Hobby Farm Fruit Stock & Booking App
### ระบบจองผลไม้สวนเกษตร

**Version 1.4** · April 2026

---

### Changelog

**v1.4** — Public fruit grid is now 2 columns on phones, 4 columns on tablets and desktop (was 1 / 2). Repo created on GitHub as `swas-fruit-market`.

**v1.3** — Owner + managed users auth model (owner creates/resets passwords for dad, mom, etc.); public refresh strategy confirmed as ISR + 20s client polling (Option B); stock locking happens only on save, not while filling the form; LINE button moved to scroll-end footer; booking → checkout → shipped flow with `receipts.booking_id` linkage and anti-double-deduction rule.

**v1.2** — Two separate admin passwords (one per admin) instead of shared; LINE chat button moved from fruit detail to public header; document reformatted as markdown.

**v1.1** — Password auth, `pricing_mode` (per_unit / per_weight), CSV export, optional stock-deduct on checkout, admin UI uses normal font sizes, hole fixes.

---

## 1. Overview

### 1.1 Background

Every Saturday, the farm owner returns from a hobby farm with a batch of seasonal fruits. The family manually logs the haul by quantity and weight (kg), then takes bookings from customers through a LINE Open Chat group and phone calls. Bookings and stock levels are currently tracked on paper, which is slow, error-prone, and gives customers no real-time visibility into what is available.

### 1.2 Goal

Build a lightweight, mobile-first web app that:

- Lets admins (owner + family) log weekly fruit stock, manage bookings, and issue receipts.
- Gives customers in the LINE group a near-real-time public page showing available fruits, prices, and booked quantities.
- Loads in under 1 second on mobile for the public view, because most customers are older and may have slow connections.
- Displays everything in Thai. Public view uses large typography; admin UI uses normal sizes.

### 1.3 Success Metrics

- Public stock page: First Contentful Paint ≤ 1 second on a 4G mobile connection.
- Admin can log a new fruit and publish it to the public page in under 30 seconds.
- Zero paper booking logs after 2 weeks of use.
- Customers can view fruit details without zooming on a phone screen.
- Stays within Vercel + Supabase free tiers.

---

## 2. Users & Roles

| Role | Who | What they do |
|---|---|---|
| **Owner** | Me | Everything an Admin can do, plus manage other admin accounts (create, reset password, delete) |
| **Admin** | Dad, Mom, anyone else I create | Manage fruit catalogue, weekly stock, bookings, receipts, history |
| **Public Customer** | Members of LINE Open Chat, phone customers | View this week's available fruits, prices, remaining quantity, fruit details. No login. |

---

## 3. Tech Stack & Architecture

### 3.1 Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend / DB:** Supabase (Postgres + Storage for fruit images)
- **Hosting:** Vercel (auto-deploy from GitHub main branch)
- **Repo:** GitHub (single repo, main + dev branches)
- **Font:** Noto Sans Thai (Google Fonts, self-hosted via `next/font`). Weights: 400, 700.
- **Icons:** Lucide
- **No Supabase Realtime subscriptions** — public page uses client-side polling instead (see §3.3).

### 3.2 Authentication (Owner + managed users)

Two-tier password model. Owner is seeded once in SQL; all other admins are created by the owner in-app.

**Account model**

- `admin_users` table: `{ id, name, password_hash, role, session_version, created_by, created_at, last_login_at }`
- `role` ∈ `{ owner, admin }`
- Exactly one `owner` row, seeded via SQL migration with a bcrypt hash I generate locally
- Owner can never be deleted via the UI

**Login flow**

1. User picks their name from a dropdown (populated from `admin_users` where not soft-deleted)
2. Enters their password
3. POST `/api/admin/login` → server looks up the row, compares bcrypt, on success sets httpOnly secure cookie (JWT encoding `{ admin_id, name, role, session_version }`, 30-day expiry)
4. Middleware protects all `/admin/*` routes; JWT validated on every request against the row's current `session_version`

**Owner's user management page (`/admin/users`)** — accessible only when `role = owner`

- List all admin accounts (name, role, created date, last login)
- **Create new admin:** name + initial password → creates row with `role = admin`
- **Reset password:** pick user → enter new password → save. Bumps `session_version` so any active sessions for that user are invalidated on next request.
- **Delete admin:** soft-delete (sets `deleted_at`); `bookings.created_by` and `receipts.created_by` foreign keys remain intact for history
- Owner can reset their own password here too. If owner forgets it entirely, I update the DB row directly.

**Security**

- Rate limit: 5 failed login attempts per IP per 15 minutes
- Bcrypt cost factor 10
- No self-serve password reset (owner handles all resets)
- Per-admin audit trail: `bookings.created_by`, `receipts.created_by` reference `admin_users.id` — history CSV exports show who did what

### 3.3 Performance Strategy (target: under 1 second public view)

**Refresh strategy: ISR + 20-second client polling (no Supabase Realtime).**

- Public stock page is a Server Component with ISR (revalidate every 30 seconds) — HTML ships pre-rendered, fast first paint
- After first paint, a small client component polls `/api/public/stock` every 20 seconds in the background and updates stock + booked numbers in place
- Polling pauses when the tab is backgrounded (Page Visibility API) — saves ~60% of requests
- `/api/public/stock` returns a tiny JSON payload: only `{ week_id, items: [{ fruit_id, available, booked }] }` — typically under 1 KB
- HTTP cache headers (`Cache-Control: public, max-age=5, stale-while-revalidate=15`) let Vercel's edge cache absorb duplicate polls in the same 5s window, so Supabase reads stay low

**Other optimizations**

- Fruit images: uploaded from phone are resized client-side to max 1200px and converted to WebP before upload (`browser-image-compression`, ~30KB lib), keeping Supabase Storage usage low. Served via Next.js `<Image>` with blurred placeholder (fuzzy load). Above-the-fold images priority-loaded; below-the-fold lazy on scroll.
- Critical CSS inlined, Tailwind purged. Target initial JS bundle: under 80 KB gzipped for the public route.
- Noto Sans Thai subset to Thai + Latin only; preloaded in `<head>`.
- No heavy client libraries on the public page — no charts, no animation libraries.

**Cost envelope (confirms free-tier fit)**

- Assume 50 group members, 20 actively viewing on Saturday morning for ~10 min each
- Polling: 20 users × 3 polls/min × 10 min = ~600 extra API calls on peak day
- Total weekly Supabase reads: ~2,000–5,000 (far below any limit)
- Vercel function invocations: trivial fraction of free-tier allowance

### 3.4 Data Model (Supabase tables)

| Table | Key fields | Purpose |
|---|---|---|
| **admin_users** | `id, name, password_hash, role, session_version, created_by, deleted_at, created_at, last_login_at` | Owner + managed admins. Owner seeded manually. |
| **fruits** | `id, name_th, selling_unit, stock_unit, pricing_mode, description, image_url, created_at, deleted_at` | Master fruit catalogue. `pricing_mode` ∈ `{per_unit, per_weight}`. Soft-delete via `deleted_at`. |
| **weeks** | `id, start_date, is_active, closed_at, created_at` | Represents one Saturday stock cycle. Only one `is_active = true` at a time. |
| **week_stock** | `id, week_id, fruit_id, stock_qty, price_value, notes` | This week's available fruits. `price_value` interpretation depends on `fruit.pricing_mode`. |
| **bookings** | `id, week_id, customer_name, contact, status, created_by, created_at, updated_at` | `status`: `pending \| shipped \| cancelled`. |
| **booking_items** | `id, booking_id, fruit_id, qty, unit_snapshot, price_snapshot, pricing_mode_snapshot, name_snapshot` | Line items. All relevant values snapshotted so later edits don't rewrite history. |
| **receipts** | `id, week_id, booking_id, customer_name, items_json, total, deducted_stock, status, created_by, created_at` | Saved checkout bills. `booking_id` is nullable (walk-in customers have no booking). `status` ∈ `{active, void}`. Per-weight items in `items_json` store both qty (pieces) and `weight_kg`. |
| **settings** | `key, value` | Key-value store: `line_chat_url`, `shop_name`. |

### Stock locking — save-time only, not while editing

**Key principle:** no locks while the admin is filling out a booking form. Locks happen *only* in the final save transaction.

**Booking form behavior**

- When admin opens the booking form, the page fetches current week stock *once* into memory
- Fruit dropdowns show available numbers as a hint (*"ส้ม · เหลือ 12 กิโล"*)
- Adding/removing line items is pure client-side — no DB calls, no delays
- Admin can take their time; no timeout, no lock timer

**Save transaction** (single request to `/api/admin/bookings`)

1. BEGIN transaction
2. `SELECT ... FOR UPDATE` on the relevant `week_stock` rows (just the fruits in this booking)
3. Compute current available = `stock_qty − booked_count` (recalculated fresh from `bookings` + `receipts` where `deducted_stock`)
4. Validate each line item against current available
5. If any line fails: ROLLBACK, return Thai error identifying which fruit is short and how much is actually available, keep the form filled so admin can adjust
6. Otherwise: INSERT booking + booking_items, COMMIT
7. On lock conflict (extremely rare — two admins saving the same moment): retry once automatically, then error if still conflicting

Typical save takes 50–150ms. Form is fast because there are zero DB round-trips until submit.

### Stock math (booked count)

Booked count for a fruit = sum of qty from:

1. `booking_items` where `booking.status IN ('pending', 'shipped')`
2. `receipts` where `deducted_stock = true` AND `status = 'active'` AND `booking_id IS NULL` (walk-in receipts only — bookings already counted above)
3. Available = `stock_qty − booked_count`, clamped to zero for display; admin sees a red warning if negative

### Anti-double-deduction rule

When a receipt is linked to a booking (`receipts.booking_id IS NOT NULL`), the receipt's items are NOT counted again — the booking's items are the source of truth. This is why we only count walk-in receipts in step 2 above.

### Row Level Security (RLS)

- Public anon role: SELECT only on `fruits` (where `deleted_at IS NULL`), `week_stock` (where `week.is_active`), `settings`.
- Admin writes go through Next.js API routes that verify the cookie before calling Supabase with `service_role` key. No direct client-to-Supabase writes from admin pages.

---

## 4. Features

### 4.1 Admin Login

- Route: `/admin/login`
- Two-step form: name dropdown → password field with show/hide toggle
- Submit → POST `/api/admin/login` → httpOnly cookie set, redirect to `/admin`
- 5 failed attempts in 15 minutes locks out that IP for 15 minutes
- Top-right of admin pages shows *"เข้าสู่ระบบเป็น: [name]"* with a logout button

### 4.2 Owner: User Management (จัดการผู้ใช้)

**Route:** `/admin/users` (owner only; returns 403 for regular admins)

**List view**

- Table: Name · Role · Created · Last login · Actions
- Owner row is visually distinct (gold/green badge) and cannot be deleted

**Actions**

- **สร้างบัญชีใหม่** — form with name + password fields → creates row with `role = admin`
- **รีเซ็ตรหัสผ่าน** — modal with new password field → updates hash and bumps `session_version`
- **ลบบัญชี** — soft-delete (sets `deleted_at`); confirm dialog warns that historical records (bookings, receipts) will still show that person's name

### 4.3 Admin: Fruit Catalogue (คลังผลไม้)

**Route:** `/admin/catalogue`

One-time master list of fruits you ever sell.

**Fields per fruit**

- **Fruit name (ชื่อผลไม้)** — text, Thai, required
- **Selling unit (หน่วยขาย)** — text, e.g. ลูก / กิโล / ถุง, required
- **Stock unit (หน่วยสต็อก)** — text, required
- **Pricing mode (วิธีคิดราคา)** — required:
  - `per_unit` — *"ราคาต่อหน่วยขาย"* (e.g. 80฿/กิโล for mangoes, 50฿/ลูก for mangosteens)
  - `per_weight` — *"คิดราคาตามน้ำหนักจริง"* (e.g. durian: booked by ลูก, weighed at pickup, price is ฿/กก.)
- **Description (รายละเอียด)** — long text
- **Image (รูปภาพ)** — optional, client-side resized to max 1200px WebP before upload

**Actions**

- Add, edit, soft-delete
- Deleted fruits hidden from selectors but remain readable in past-week history
- List view: thumbnail + name + selling unit + pricing-mode badge, sorted alphabetically

### 4.4 Admin: Weekly Stock Panel (สต็อกสัปดาห์นี้)

**Route:** `/admin/stock`

**Flow**

1. If no active week exists → big *"เริ่มสัปดาห์ใหม่"* button
2. Once active, show all non-deleted catalogue fruits with a checkbox for "include this week"
3. For each included fruit, input: stock quantity (stock_unit) and price (label changes by pricing_mode)
4. Save — instantly published to public page

**Rules**

- One active week at a time
- Mid-week adjustments allowed
- Removing a fruit blocked if pending/shipped bookings reference it
- Stale-week banner after 7 days

### 4.5 Admin: Booking Panel (จอง)

**Route:** `/admin/bookings`

**New booking form**

- Customer name (ชื่อลูกค้า) — required
- Contact (เบอร์โทร / LINE ID) — at least one required
- Fruit line items — repeatable rows with dropdown + quantity
- For per_weight fruits: note *"ราคาจะคิดตามน้ำหนักจริงตอนชั่ง"*
- No DB locks while filling out; save triggers the validation transaction (see §3.4)

**Booking list**

- Default filter: this week, status = pending
- Each row: customer, contact, item summary, total THB (or *"คิดตามน้ำหนัก"*), status badge, created_by name
- Tap row → detail view

**Booking detail view (`/admin/bookings/[id]`)**

Shows full booking info plus action buttons based on status:

**For `pending` bookings — four actions:**

| Button | Action |
|---|---|
| **แก้ไข** | Opens the booking form pre-filled. Can change customer info, add/remove line items, adjust qty. Save re-runs the stock validation transaction. |
| **คิดเงิน** | Opens `/admin/checkout` pre-filled with booking's items. See §4.6 for the full flow. |
| **ส่งแล้ว (ไม่ออกบิล)** | One-tap + confirm → status = `shipped`, no receipt created. For when you don't need a formal bill. |
| **ยกเลิก** | One-tap + confirm → status = `cancelled`, stock released back. |

**For `shipped` bookings — two actions:**

| Button | Action |
|---|---|
| **ดูใบเสร็จ** | Visible only if a linked receipt exists. Opens the receipt view. |
| **ยกเลิก** | Still available (for returns/complaints). Confirm dialog warns: *"ใบเสร็จที่เชื่อมโยงจะถูกทำเป็นโมฆะ (void) แต่จะไม่ถูกลบ"*. On confirm: booking status = `cancelled`, linked receipt (if any) status = `void`, stock released back. |

**For `cancelled` bookings:** read-only, no action buttons.

**Booking flow diagram**

```
          ┌──────────┐   แก้ไข (edit items)   ┌──────────┐
   สร้าง →│ pending  │◄───────────────────── │ pending  │
          └────┬─────┘                       └──────────┘
               │
      ┌────────┼──────────┬─────────────┐
      │        │          │             │
   คิดเงิน  ส่งแล้ว      ยกเลิก       (nothing)
      │  (ไม่ออกบิล)       │
      ▼        ▼          ▼
  ┌─────────┐  ┌──────────┐  ┌──────────┐
  │receipt+ │  │ shipped  │  │cancelled │
  │shipped  │  │          │  │          │
  └────┬────┘  └────┬─────┘  └──────────┘
       │           │
       │       ยกเลิก (return)
       │           │
       └──→ cancelled (+ void receipt if present)
```

### 4.6 Admin: Checkout (คิดเงิน)

**Route:** `/admin/checkout` (blank form) or `/admin/checkout?booking=<id>` (pre-filled from booking)

Quick bill calculator. Works standalone (walk-in) or as the billing step of an existing booking.

**Two entry modes**

**Mode A — Walk-in (no booking):**

- Admin fills customer name + fruits from scratch
- **หักสต็อก** checkbox — default ON, editable
- On save: creates receipt with `booking_id = NULL`; if checkbox ON, counts against stock

**Mode B — From booking (opened via "คิดเงิน" button):**

- Form pre-fills customer name, contact, line items from the booking
- Admin can adjust: change quantities, add new items the customer picked up on the spot, remove items they didn't take, enter real weights for per_weight items
- **หักสต็อก** checkbox is hidden — the booking already reserved the stock, and double-counting would break numbers
- On save: creates receipt with `booking_id = <id>`, auto-transitions the booking to `shipped`
- If the admin changed line items vs. the original booking (e.g. qty increased, new fruit added), the booking's `booking_items` are updated to match the final receipt so stock math stays consistent

**Form**

- Customer name — text
- Add fruit rows: pick fruit, enter quantity, (for per_weight) enter weight in kg → line total auto-calculates
- Grand total updates in real time
- Remove row button per line

**Receipt (ใบเสร็จ)**

- Tap *"สร้างใบเสร็จ"* → clean, screenshot-friendly bill
- Layout: shop name (text only), date in Thai Buddhist era, line items, grand total, *"ขอบคุณครับ/ค่ะ"*
- Per-weight items show breakdown: *"ทุเรียน 1 ลูก (2.3 กก.) × 180฿/กก. = 414฿"*
- Two buttons: *"บันทึก"* (saves to `receipts`, transitions booking to shipped if applicable) and *"ถ่ายภาพ"* (instructions to screenshot)
- Sized ~380px wide, high contrast

**Receipt view (`/admin/receipts/[id]`)**

- Read-only display of a saved receipt
- If linked to a booking, a link back to the booking
- If `status = void`, large red *"โมฆะ (ยกเลิกแล้ว)"* watermark
- Receipts are never deleted — only voided

### 4.7 Admin: History (ประวัติ)

**Route:** `/admin/history`

**View**

- List of weeks, newest first. Each card: start date, total bookings, total revenue, # fruits sold
- Tap a past week → read-only view of stock, bookings, receipts (including void ones) for that week

**CSV export**

- Each past-week card has *"ดาวน์โหลด CSV"* button
- Export: three CSVs zipped —
  - `stock.csv` — fruit, stock qty, price, unit
  - `bookings.csv` — customer, contact, fruit, qty, price, status, timestamps, created_by
  - `receipts.csv` — customer, items, total, booking_id, status (active/void), timestamp, created_by
- UTF-8 with BOM so Excel opens Thai correctly
- Top-of-page *"ดาวน์โหลดทั้งหมด"* button exports every past week

**Start new week**

- Big *"เริ่มสัปดาห์ใหม่"* button
- Confirm dialog: *"สัปดาห์นี้จะถูกปิด ข้อมูลจะเก็บไว้ในประวัติ — ยืนยัน?"*
- Sets current week `is_active=false, closed_at=now`, creates new week with `is_active=true`
- Pending bookings on old week: dialog asks whether to auto-cancel or leave as-is
- Data is NEVER deleted

### 4.8 Public Customer View (หน้าลูกค้า)

**Route:** `/` (root)

**Header**

- Shop name (from `settings.shop_name`) in large bold Thai
- Subtitle: *"ผลไม้สัปดาห์ที่ "* + start date in Thai Buddhist era (Bangkok timezone)
- No navbar, no menu, no login button
- No LINE button here (it's at the footer)

**Fruit card grid**

- Two columns on phones, four columns on tablets and desktop (Tailwind: `grid-cols-2 md:grid-cols-4`)
- Each card (min 48px tap targets):
  - Fruit image (lazy-loaded, blur placeholder)
  - Fruit name (min 24px / 1.5rem)
  - Price line — format depends on `pricing_mode`:
    - per_unit: *"ราคา 80 บาท / กิโล"*
    - per_weight: *"ราคา 180 บาท / กิโล · จองเป็นลูก"*
  - Stock line: *"เหลือ X [stock unit]   จองแล้ว Y [stock unit]"*
  - Sold out: grayed card with *"หมดแล้ว"* badge

**Mid-scroll hint**

- After ~half the fruit cards, a subtle inline hint: *"↓ เลื่อนลงเพื่อจองผ่าน LINE"* — helps first-timers know the LINE button is waiting at the bottom

**Scroll-end footer**

- Full-width green bar at the end of the fruit list (not sticky; part of the page flow)
- Tall (~64px), centered, high contrast
- Content: *"📱 จองผ่าน LINE แชท"* + small subtext *"คลิกเพื่อเปิดกลุ่ม"*
- Tap → opens `settings.line_chat_url` (LINE Open Chat link)
- Bottom of footer: *"อัปเดตล่าสุด HH:MM"* timestamp

**Detail view (`/fruit/[id]`)**

- Big image, full description, price, stock, booked count
- Pricing mode clearly stated in Thai
- Back button
- Same scroll-end LINE footer at bottom

**Typography (public only — admin uses normal sizes)**

- Base body text: 20px minimum
- Fruit names on cards: 24px bold
- Prices: 22px bold, accent color
- High contrast: black text on white
- Thai-friendly line height: 1.6

**Auto-refresh (polling)**

- After initial ISR-rendered paint, client polls `/api/public/stock` every 20 seconds
- Polling pauses when tab is hidden
- Stock/booked numbers update in place — no flicker, no full reload
- Timestamp *"อัปเดตล่าสุด HH:MM"* in footer reflects the most recent successful poll

### 4.9 Admin: Settings (ตั้งค่า)

**Route:** `/admin/settings`

- **Shop name (ชื่อร้าน)** — public header + receipt
- **LINE Open Chat URL (ลิงก์ LINE แชท)** — powers the scroll-end footer button
- Stored in `settings` table as key/value rows

---

## 5. Non-Functional Requirements

### 5.1 Performance

- Public page: FCP under 1 second on 4G, under 500ms on WiFi
- Time-to-Interactive under 2 seconds on mid-tier Android
- Admin pages: under 2 seconds FCP
- Lighthouse mobile Performance ≥ 90, Accessibility ≥ 95 (public route)
- Stays within Vercel Hobby + Supabase Free tiers

### 5.2 Accessibility (public view)

- WCAG AA contrast ratios
- All tap targets minimum 48×48px
- Semantic HTML
- `aria-label` on icon-only buttons

### 5.3 Mobile-first

- Portrait phone screens (375px baseline)
- No horizontal scroll anywhere
- Bottom tab bar on admin: *สต็อก · จอง · คิดเงิน · ประวัติ*
- Catalogue + Settings + Users via top-right gear icon

### 5.4 Reliability & offline handling

- Admin writes use optimistic UI; on failure red Thai toast with *"ลองอีกครั้ง"* replays the request
- Form validation inline, in Thai
- Supabase daily backup (free tier)
- All dates stored UTC, displayed Asia/Bangkok via `date-fns-tz`

### 5.5 Out of scope for v1

- Online payment
- Delivery tracking
- Customer self-service booking
- Multi-shop support
- SMS / LINE bot notifications
- Analytics beyond CSV export and history totals
- Supabase Realtime subscriptions (polling is sufficient and simpler)
- Bag/conversion pricing mode

---

## 6. Information Architecture

| Audience | Route | Purpose |
|---|---|---|
| Public | `/` | This week's fruit list + scroll-end LINE footer |
| Public | `/fruit/[id]` | Single fruit detail + scroll-end LINE footer |
| Public (API) | `/api/public/stock` | Lightweight polling endpoint (JSON, <1KB) |
| Admin | `/admin/login` | Name + password gate |
| Admin | `/admin` | Dashboard (redirects to `/admin/stock`) |
| Admin | `/admin/catalogue` | Master fruit list CRUD |
| Admin | `/admin/stock` | This week's stock & prices |
| Admin | `/admin/bookings` | Booking list |
| Admin | `/admin/bookings/[id]` | Booking detail (edit / bill / ship / cancel) |
| Admin | `/admin/checkout` | คิดเงิน + ใบเสร็จ (walk-in or from booking) |
| Admin | `/admin/receipts/[id]` | Receipt view (read-only) |
| Admin | `/admin/history` | ประวัติ + CSV export + start new week |
| Admin | `/admin/settings` | Shop name + LINE chat URL |
| Owner | `/admin/users` | Create / reset / delete admin accounts |

---

## 7. Visual Design Direction

### 7.1 Font

Noto Sans Thai (self-hosted via `next/font/google`).

- Fallback: `'Noto Sans Thai', 'Sarabun', system-ui, -apple-system, sans-serif`
- Weights: 400, 700 only

### 7.2 Font sizing policy

- **Public view (`/`, `/fruit/[id]`):** large typography — base 20px, fruit names 24px, prices 22px
- **Admin UI (`/admin/*`):** normal — base 14–16px, standard UI density

### 7.3 Color palette

- Primary accent: `#2E7D32` (fruit green)
- Accent light: `#E8F5E9`
- Text primary: `#111111` on white
- Text muted: `#666666`
- Success (shipped): `#2E7D32`
- Warning (pending, stale week): `#F57C00`
- Danger (cancelled, void, sold out): `#C62828`
- Background: `#FAFAFA`

### 7.4 Component style

- **Public:** large rounded cards (`border-radius: 16px`), soft shadow, generous whitespace
- **Admin:** tighter cards (`border-radius: 8px`), denser lists, normal button heights (40–44px)
- Single accent color throughout

---

## 8. Delivery Milestones

| # | Milestone | Scope |
|---|---|---|
| **M1** | Foundation | Repo setup, Next.js + Tailwind + Supabase wired, `admin_users` table seeded with owner bcrypt hash, password auth + cookie middleware, data model migrated, RLS configured, deployed to Vercel |
| **M2** | Public view | Public stock page + fruit detail page + scroll-end LINE footer + mid-scroll hint, ISR configured, `/api/public/stock` endpoint + 20s polling wired up, image pipeline (client resize + WebP + blur placeholder), performance tuned to sub-1s FCP |
| **M3** | Admin core | User management (owner only), Settings page, Catalogue CRUD (both pricing modes), Weekly Stock panel, Start-new-week flow, stale-week banner |
| **M4** | Bookings & checkout | Booking panel with detail view + edit flow, save-time stock validation transaction, checkout (both walk-in and from-booking modes), receipt generator, booking→receipt linkage, void-on-cancel logic |
| **M5** | History & polish | History tab, CSV export (zipped, UTF-8 BOM), offline error toasts with retry, Thai copy review, real-device QA on dad's phone |

---

## 9. Risk & Hole Register

| # | Issue | Mitigation |
|---|---|---|
| 1 | Concurrent booking race | `SELECT ... FOR UPDATE` in save transaction with retry-once |
| 2 | Shipped items in stock math | Shipped counts as "gone"; only cancelled releases stock |
| 3 | Editing a booking | Edit flow on pending bookings only; re-uses save transaction |
| 4 | Unit mismatch (kg vs bag) | `per_unit` + `per_weight` modes only; bag/conversion out of scope |
| 5 | Checkout vs booking stock divergence | `receipts.booking_id` link; anti-double-deduction rule; checkbox hidden when billing from booking |
| 6 | Mid-week restock with no signal | Polling picks it up within 20s; explicit "new!" badge is v2 |
| 7 | 4MB camera images | Client-side resize to 1200px WebP before upload |
| 8 | Admin forgets "start new week" | Yellow banner after 7 days |
| 9 | Password management | Owner-managed; bcrypt hashes only; `session_version` for instant revocation; rate limit 5/15min |
| 10 | Deleting a catalogue fruit breaks history | Soft-delete; `booking_items` snapshot name/price/unit |
| 11 | Timezone | UTC storage, Asia/Bangkok display via `date-fns-tz` |
| 12 | Offline / bad signal on farm | Red toast on write failure with *"ลองอีกครั้ง"* replay |
| 13 | Cancelling a shipped booking with a receipt | Receipt becomes `status = void` (not deleted), stock released, visible in history with red watermark |
| 14 | Admin forgets password | Owner resets it from `/admin/users`. Owner forgets own password → I update the DB directly |

---

## 10. Decisions Log

| Question | Decision |
|---|---|
| Auth method | Owner (seeded) + managed admins. Owner creates/resets/deletes other accounts from `/admin/users`. |
| Public refresh strategy | ISR 30s + 20s client polling on `/api/public/stock` (no Supabase Realtime). Polls pause when tab hidden. Free-tier cost confirmed. |
| Stock locking timing | Save-time only — no locks while filling the form. Single transaction with retry-once. |
| Public contact button placement | Scroll-end footer (not sticky, not in header). Mid-scroll hint tells users it's at the bottom. |
| Booking → billing → shipped flow | Pending bookings have four actions: *แก้ไข / คิดเงิน / ส่งแล้ว (ไม่ออกบิล) / ยกเลิก*. "คิดเงิน" opens checkout pre-filled, saves receipt with `booking_id`, auto-transitions to shipped. |
| Checkout stock deduction | Checkbox for walk-ins (default ON); hidden when billing from a booking (anti-double-deduction). |
| Cancelling a shipped booking | Stock released back; linked receipt becomes `status = void`, never deleted. |
| Selling unit vs stock unit | `per_unit` + `per_weight` modes. Durian: book by ลูก, weigh at pickup. |
| CSV export | Zipped 3-CSV bundle per week, plus "export all". UTF-8 with BOM. Includes `created_by` and receipt `status` columns. |
| Minimum order quantity | None — free-form. |
| Receipt branding | Shop name text only, no logo. |
| Font sizing scope | Large typography on public view only. Admin UI uses normal sizes. |
