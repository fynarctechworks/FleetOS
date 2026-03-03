# FleetOS — Lessons Learned

> Claude updates this file after EVERY correction from the project owner.
> Review this file at the START of every new session.
> Format: [MISTAKE] → [ROOT CAUSE] → [RULE TO PREVENT RECURRENCE]

---

## How to Use This File

When the project owner corrects you:
1. Stop what you're doing
2. Understand the root cause (not just the symptom)
3. Add an entry below in the standard format
4. Apply the rule immediately for the rest of the session
5. Review all rules at session start

---

## Rules (Updated As Project Progresses)

### RULE-001 — Pre-loaded from TRD
**Mistake:** Storing full Aadhaar number
**Root Cause:** Not checking TRD security requirements before implementing driver form
**Rule:** Before implementing ANY form that handles personal data, re-read TRD Section 6.4. Driver Aadhaar = last 4 digits ONLY. Bank account = AES-256 encrypted. NEVER full 12-digit Aadhaar.

### RULE-002 — Pre-loaded from TRD
**Mistake:** Calling Meta WhatsApp API from client-side code
**Root Cause:** Shortcut — client call is faster to implement
**Rule:** WhatsApp API calls go through Edge Functions ONLY. The token must never appear in client bundle. Period.

### RULE-003 — Pre-loaded from TRD
**Mistake:** Using `WidthType.PERCENTAGE` in tables
**Root Cause:** Seemed simpler than calculating DXA values
**Rule:** Always use `WidthType.DXA` for table widths in docx generation. Percentages break in Google Docs.

### RULE-004 — Pre-loaded from architecture
**Mistake:** Adding a new table without enabling RLS
**Root Cause:** Creating the table quickly and forgetting the security step
**Rule:** Every new Supabase table gets three things in this order: (1) CREATE TABLE, (2) ALTER TABLE ENABLE ROW LEVEL SECURITY, (3) CREATE POLICY. Never skip steps 2 and 3.

### RULE-005 — Pre-loaded from architecture
**Mistake:** Using `FlatList` instead of `FlashList` for long lists
**Root Cause:** FlatList is the default React Native component that comes to mind
**Rule:** All list views in FleetOS use `@shopify/flash-list`. FlatList is banned. This matters for vehicle lists, LR lists, trip lists at scale.

### RULE-006 — Pre-loaded from architecture
**Mistake:** Building NIC E-Way Bill API integration in MVP
**Root Cause:** It was listed in the feature set
**Rule:** E-Way Bill in MVP = manual number entry only. NIC API requires GST Suvidha Provider registration (takes weeks). The field stores the number the user types. Build NIC API in V2 only.

### RULE-007 — Pre-loaded from architecture
**Mistake:** Using Expo Go for testing WatermelonDB
**Root Cause:** Expo Go is convenient for quick testing
**Rule:** WatermelonDB requires a native build. Always use `eas build --profile development` to create a development build. Expo Go will crash with WatermelonDB.

---

## Session-Specific Lessons

> New lessons added here as the project progresses.

### LESSON-001 — Zod `.default()` breaks react-hook-form resolver
**Mistake:** Using `z.coerce.number().min(0).default(0)` in Zod schema
**Root Cause:** `.default()` makes the field optional in Zod's output type (`number | undefined`), but react-hook-form's `Resolver<T>` expects the exact `T` type. The mismatch causes `Type '...' is not assignable to type '...'` errors.
**Rule:** Never use `.default()` in Zod schemas used with react-hook-form. Set defaults via `defaultValues` in `useForm()` instead. Same applies to `.array().default([])`.

### LESSON-002 — Lucide React icons don't accept `title` prop
**Mistake:** Passing `title="Theft flagged"` directly to `<AlertTriangle />` Lucide icon
**Root Cause:** Lucide React SVG components use `LucideProps` which doesn't include HTML `title`. Unlike native HTML elements.
**Rule:** Wrap Lucide icons in a `<span title="...">` for tooltip text. Never pass `title` directly to Lucide components.

### LESSON-003 — Next.js 14 `useSearchParams()` requires Suspense boundary
**Mistake:** Using `useSearchParams()` in a page component without wrapping in `<Suspense>`
**Root Cause:** Next.js 14 App Router with static generation bails out of prerendering when `useSearchParams()` is used without a Suspense boundary, causing build errors.
**Rule:** Any page using `useSearchParams()` must split into: (1) a default export wrapper with `<Suspense fallback={...}>`, (2) an inner form component that calls `useSearchParams()`.

### LESSON-004 — Zod `z.preprocess()` types output as `unknown` with react-hook-form
**Mistake:** Using `z.preprocess((val) => ..., z.enum([...]).optional())` for optional enum fields in forms
**Root Cause:** `z.preprocess` erases the input type to `unknown`, causing `Resolver<T>` type mismatch with react-hook-form. Same family of issues as LESSON-001.
**Rule:** For optional enum fields in HTML `<select>` (which send `""` for empty), keep the schema simple (`z.enum([...]).optional()`) and use `setValueAs` in the register call: `register('field', { setValueAs: v => v === '' ? undefined : v })`.

### LESSON-005 — Verify lucide-react icon exports before using
**Mistake:** Used `Handshake` icon from lucide-react which doesn't exist in the installed version
**Root Cause:** Icon names vary by version. Not all icons listed on lucide.dev are available in every npm release.
**Rule:** Before using a new Lucide icon, verify it's exported: check the build rather than assuming availability. Prefer common icons (Package, Users, etc.) that are stable across versions.

---

*Updated by Claude after every correction. Reviewed by Claude at every session start.*
