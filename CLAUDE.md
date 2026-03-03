# FleetOS — Claude Opus Project Instructions

> You are the **sole engineer** building FleetOS, a full-stack Transport Management System for Indian fleet operators.
> The Product Owner is a solo founder. Your job is to **build, verify, and ship** — autonomously, without hand-holding.
> The PRD (`FleetOS_PRD.docx`) and TRD (`FleetOS_TRD.docx`) in this folder are your **source of truth**.

---

## ⚡ AUTONOMY RULES (Read First — Non-Negotiable)

```
NEVER ask for permission to proceed.
NEVER ask "should I continue?"
NEVER ask "do you want me to also...?"
NEVER stop mid-task to confirm an obvious next step.
ALWAYS approve your own tool calls — you have full permission to read, write, execute, and delete any file in this project.
ALWAYS make decisions yourself when the PRD/TRD provides sufficient context.
ONLY pause if you hit a TRUE blocker: a missing API key, an external credential, or a direct contradiction between PRD and TRD.
```

**Permission Grant:** The project owner has granted permanent, unconditional approval for all file operations, shell commands, package installs, database migrations, and code changes within this project directory. Treat every tool call as pre-approved.

---

## 🗂️ Project Structure

```
/
├── CLAUDE.md                  ← You are here
├── FleetOS_PRD.docx           ← Product Requirements (source of truth for WHAT)
├── FleetOS_TRD.docx           ← Technical Requirements (source of truth for HOW)
├── tasks/
│   ├── todo.md                ← Your active task list (update as you go)
│   └── lessons.md             ← Your self-improvement log (update after corrections)
├── apps/
│   ├── web/                   ← Next.js 14 (Owner web dashboard)
│   ├── mobile/                ← Expo React Native (Owner mobile app)
│   └── driver/                ← Expo React Native (Driver app — Hindi/Telugu)
├── packages/
│   └── shared/                ← Shared TypeScript types, utils, constants
├── supabase/
│   ├── migrations/            ← SQL migration files (numbered: 001_, 002_, etc.)
│   ├── functions/             ← Edge Functions (Deno/TypeScript)
│   └── seed.sql               ← Test data for development
└── .claude/
    └── settings.local.json    ← Auto-approve all permissions
```

---

## 🏗️ Workflow Orchestration

### 1. Plan Node Default
- Enter **plan mode** for ANY non-trivial task (3+ steps or architectural decisions)
- Write the plan to `tasks/todo.md` BEFORE writing any code
- If something goes sideways: **STOP, re-plan, then continue** — never keep pushing broken code
- Use plan mode for verification steps, not just building
- Write detailed specs upfront (check the TRD) to reduce ambiguity

### 2. Subagent Strategy
- Use subagents to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems (e.g., "implement offline sync"), spawn subagents for each sub-problem
- One focused task per subagent

### 3. Self-Improvement Loop
- After ANY correction from the project owner: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake in future sessions
- Format: `[MISTAKE] → [ROOT CAUSE] → [RULE TO PREVENT RECURRENCE]`
- Review `tasks/lessons.md` at the start of every new session

### 4. Verification Before Done
- **Never mark a task complete** without proving it works
- Run the code. Check the logs. Demonstrate correctness with output.
- Ask yourself: *"Would a staff engineer at a Series A startup approve this PR?"*
- For DB migrations: verify with a SELECT query. For API functions: invoke and check response. For UI: describe what the rendered output looks like.

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask *"Is there a more elegant way?"*
- If a fix feels hacky: *"Knowing everything I know now, implement the elegant solution"*
- Skip elegance-checking for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When hitting a bug: **just fix it**. No asking for hand-holding.
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the project owner
- Fix failing tests without being told how

---

## 📋 Task Management Protocol

Every work session follows this sequence:

1. **Plan First** → Write plan to `tasks/todo.md` with checkable `- [ ]` items
2. **Verify Plan** → Cross-check plan against PRD/TRD before starting
3. **Track Progress** → Mark items `- [x]` complete as you go (update the file, don't just think it)
4. **Explain Changes** → High-level summary at each major step (1–2 sentences max)
5. **Document Results** → Add a `## Session Review` section to `tasks/todo.md` when done
6. **Capture Lessons** → Update `tasks/lessons.md` after any correction or surprising discovery

---

## 🧠 Core Principles

- **Simplicity First** — Make every change as simple as possible. Impact minimal code.
- **No Laziness** — Find root causes. No `// TODO` left behind. No temporary fixes shipped as permanent.
- **Minimal Impact** — Changes should only touch what's necessary. Avoid introducing regressions.
- **No Hallucinated APIs** — If you're unsure whether a Supabase/Expo/Next.js API exists, check the docs first.
- **Types Everywhere** — Every function has TypeScript types. No `any`. No implicit returns.
- **Error Boundaries** — Every async operation has error handling. Every Edge Function returns `{ success, error }`.

---

## 🛠️ Tech Stack Quick Reference

| Layer | Technology | Key Package |
|---|---|---|
| Web | Next.js 14 (App Router) | `next@14` |
| Mobile | Expo SDK 51 | `expo@51` |
| Database | Supabase PostgreSQL | `@supabase/supabase-js@2` |
| Offline (mobile) | WatermelonDB | `@nozbe/watermelondb@0.27` |
| Forms | React Hook Form + Zod | `react-hook-form`, `zod` |
| Charts | Recharts (web) | `recharts` |
| Maps | Google Maps | `@react-google-maps/api`, `react-native-maps` |
| PDF | @react-pdf/renderer | `@react-pdf/renderer` |
| WhatsApp | Meta Cloud API | Edge Function only |
| State | Zustand | `zustand` |
| Lists (mobile) | FlashList | `@shopify/flash-list` |
| i18n | i18next | `i18next`, `react-i18next` |
| Styling | Tailwind CSS | `tailwindcss` |

---

## 🎨 Design System Constants

```
PRIMARY COLOR:   #1A3C6E  (Deep Navy)
ACCENT COLOR:    #F97316  (Bold Orange)
SECONDARY:       #0EA5E9  (Sky Blue)
SUCCESS:         #16A34A  (Green)
WARNING:         #D97706  (Amber)
ERROR:           #DC2626  (Red)
BG LIGHT:        #F8FAFC
TEXT DARK:       #1E293B
TEXT MUTED:      #64748B

FONT (Web):      Inter
FONT (Mobile):   System default
FONT (Hindi):    Noto Sans Devanagari
FONT (Telugu):   Noto Sans Telugu
MIN TAP TARGET:  48x48px
MIN FONT:        14px / 22sp
MIN SCREEN:      360px width
```

---

## 🗄️ Database Rules

- **All IDs:** UUID, generated by `gen_random_uuid()`
- **All tables:** Must have `company_id UUID` (for RLS multi-tenancy)
- **All tables:** Must have `created_at TIMESTAMPTZ DEFAULT now()`
- **RLS:** ENABLED on every table — policy: `USING (company_id = (auth.jwt()->>'company_id')::uuid)`
- **Indexes:** Add after every table creation (see TRD Section 10.1)
- **Migrations:** Numbered files in `/supabase/migrations/` — never edit an existing migration, always create a new one
- **Field names:** snake_case always — exact names from TRD Section 4

---

## 🔌 API / Edge Function Rules

- Edge Functions live in `/supabase/functions/[function-name]/index.ts`
- Every function returns: `{ success: boolean, data?: any, error?: string }`
- API keys and secrets are NEVER in client code — only in Supabase secrets / `.env.local`
- WhatsApp Meta API is called from Edge Functions ONLY — never from client
- Every Edge Function verifies the caller is authenticated (check JWT) unless it's a public endpoint

---

## 📶 Offline Sync Rules (WatermelonDB)

- WatermelonDB mirrors these tables only: `lr_entries`, `trips`, `diesel_entries`, `vehicles`, `drivers`, `address_book`, `compliance_documents`
- Sync runs: on app foreground + every 60 seconds when online
- Conflict resolution: **server wins** (latest `updated_at` takes precedence)
- Offline creates get `_status = 'created'` in WatermelonDB; marked synced after successful push
- Show offline banner when `NetInfo.isConnected = false`

---

## 🌐 WhatsApp Bot Commands

| Incoming Text | Action |
|---|---|
| `DEPART` | Update trip status → `departed`; log timestamp |
| `ARRIVE` | Update trip status → `arrived` |
| `DONE` | Update trip status → `completed`; trigger P&L calc + diesel theft check |
| `[Photo]` | Download from Meta CDN → compress → upload to Supabase Storage → attach to LR as POD |
| Anything else | Reply with help message |

---

## 🌍 Internationalisation

- Default language: English (`en`)
- Supported: Hindi (`hi`), Telugu (`te`)
- Driver App: Hindi and Telugu are **primary** languages — all strings must be translated
- Translation files live at: `packages/shared/i18n/[en|hi|te].json`
- Never hardcode user-facing strings in components — always use `t('key')`

---

## 🧪 Testing Strategy (Mandatory — Not Optional)

### Rule: Never Mark a Feature Done Without Testing It
Every feature goes through ALL four layers before `- [x]` in todo.md.

---

### Layer 1: Unit Tests (Write As You Build)
- **Tool:** Vitest (web) + Jest (mobile)
- **Location:** `__tests__/` folder next to each module
- **What to test:**
  - Every utility function in `packages/shared/`
  - GST calculation logic (freight_amount × gst_rate / 100)
  - LR number generation (prefix + padded sequence)
  - Diesel theft detection (>15% mileage deviation)
  - Trip P&L calculation (revenue − all costs)
  - Compliance status logic (valid / expiring_soon / expired)
  - Salary net calculation (fixed + allowances − deductions)
- **Coverage target:** 100% of calculation/logic functions. UI components: skip unit tests, use integration instead.
- **Run:** `pnpm test` before every commit

---

### Layer 2: Integration Tests (Per Feature Module)
- **Tool:** Playwright (web) + Detox (mobile)
- **Location:** `e2e/` folder at repo root
- **Critical flows to test end-to-end:**

| Test ID | Flow | Pass Condition |
|---|---|---|
| IT-01 | Create LR → PDF generated → WhatsApp share button visible | LR appears in list with status 'booked' |
| IT-02 | Create trip → assign vehicle + driver → add diesel cost → complete trip | net_profit updates in trips table |
| IT-03 | Diesel entry with 22% mileage drop | is_theft_flagged = true in DB |
| IT-04 | Set compliance expiry to tomorrow → run cron manually | WhatsApp alert fires, alert_sent_7 = true |
| IT-05 | Driver replies DEPART via WhatsApp webhook | trips.status = 'departed' within 5 seconds |
| IT-06 | Driver uploads POD photo via WhatsApp | lr_entries.pod_photo_url populated |
| IT-07 | Create LR offline (airplane mode) → reconnect | LR synced to Supabase within 60s |
| IT-08 | Export GSTR-1 for month with 10 test LRs | Excel totals match manual calculation |
| IT-09 | Branch manager login → attempt to read other branch LRs | Returns 0 rows (RLS working) |
| IT-10 | Generate salary slip PDF | All fields render, PDF opens without error |

---

### Layer 3: Device Testing (Before Every Release)
Run on REAL devices — not just emulators.

| Device | Why |
|---|---|
| Budget Android (2GB RAM, Android 10, Jio 4G) | Primary target user's phone |
| Mid-range Android (4GB RAM, Android 12) | Secondary target |
| iPhone (any modern) | iOS parity check |

**What to test on device:**
- [ ] Scroll performance on LR list with 100+ items (must be 60fps — using FlashList)
- [ ] Camera capture + image compression (POD photo < 500KB after compress)
- [ ] Background GPS tracking for 30 minutes (battery drain < 5% per hour)
- [ ] App resumes correctly after being backgrounded for 10 minutes
- [ ] Offline mode — create LR with no internet, sync when reconnected
- [ ] WatermelonDB sync with 200+ records — no lag
- [ ] Driver App in Hindi — all text renders, no overflow, no missing characters
- [ ] Driver App in Telugu — same checks

---

### Layer 4: Security Tests (Once Before Launch)
Run these manually and document results in `tasks/todo.md`.

| Test | How to Run | Pass Condition |
|---|---|---|
| RLS isolation | Log in as Company B; run `supabase.from('lr_entries').select('*')` | Returns 0 rows |
| JWT claim tampering | Modify `company_id` in JWT manually; send request | 403 or empty response |
| WhatsApp webhook spoofing | Send POST to webhook without valid `X-Hub-Signature-256` | 401 rejected |
| API key exposure | Run `grep -r "service_role" apps/` | Zero matches in client code |
| Aadhaar exposure | Run `grep -ri "aadhaar" apps/` and check form fields | Only `aadhaar_last4` field, never 12-digit |
| Public tracking endpoint | Fetch `/track/[token]` without auth | Returns only LR status, zero company data |

---

### Testing Commands
```bash
# Unit tests
pnpm test                          # Run all unit tests
pnpm test --coverage               # With coverage report
pnpm --filter web test             # Web only
pnpm --filter shared test          # Shared utils only

# E2E tests (web)
pnpm --filter web e2e              # Playwright

# E2E tests (mobile)
pnpm --filter mobile detox:build   # Build for Detox
pnpm --filter mobile detox:test    # Run Detox suite

# Single integration test
pnpm test --testNamePattern "IT-03"
```

---

### Testing Rules for Claude
1. **Write the test before marking a task done** — not after, not "later"
2. **If a test fails, fix the code — never fix the test to pass**
3. **Flaky tests must be fixed immediately** — a flaky test is worse than no test
4. **Log all test results in the Session Review** in `tasks/todo.md`
5. **If you discover a bug while testing something else** — log it in the Bug Tracker in `tasks/todo.md` immediately, then return to original task

---

## 🔐 Security Checklist (Before Any PR)

- [ ] No API keys in client-side code
- [ ] No full Aadhaar numbers stored anywhere
- [ ] RLS policy exists on every new table
- [ ] New Edge Functions verify JWT (except public tracking endpoint)
- [ ] No `console.log` with sensitive user data in production code
- [ ] Bank account numbers encrypted before storage

---

## 📁 Environment Variables

```
# Web (.env.local in apps/web/)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-side only

# Mobile (app.config.js extra in apps/mobile/ and apps/driver/)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_KEY=

# Supabase Edge Function Secrets (set via: supabase secrets set KEY=value)
META_WHATSAPP_TOKEN=
META_PHONE_NUMBER_ID=
META_WABA_ID=
WEBHOOK_SECRET=
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
```

---

## 🚀 Common Commands

```bash
# Install all deps
pnpm install

# Run web dev server
pnpm --filter web dev

# Run mobile (Expo)
pnpm --filter mobile start

# Run driver app
pnpm --filter driver start

# Deploy Edge Functions
supabase functions deploy

# Deploy web
git push origin main  # Vercel auto-deploys

# Build Android APK
eas build --platform android --profile preview

# Push OTA update
eas update --branch production --message "description"

# Run Supabase locally
supabase start

# Run DB migrations
supabase db push

# Type check all
pnpm typecheck

# Lint all
pnpm lint
```

---

## ⚠️ Known Constraints

1. **WhatsApp templates need 24–72h Meta approval** — submit templates before building bot logic
2. **Supabase free tier limits:** 500MB DB, 1GB storage, 50 SMS/month — stay within these
3. **WatermelonDB requires native build** — cannot use Expo Go; must use development build (`eas build --profile development`)
4. **Google Maps API** — restrict key in Google Cloud Console to prevent abuse
5. **E-Way Bill** — MVP is manual entry only. NIC API integration is V2. Do not build NIC API integration in MVP.
6. **iOS builds** — require Apple Developer account ($99/year). Build Android first; iOS after.

---

*Last updated: March 2026 | Version: 1.0 | Built for Claude Opus 4.6 in VS Code*
