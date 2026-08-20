# Refero

Refero is PSU's thesis management system — the place where students submit their research and where anyone in the university can look up theses by college, program, or topic.

The original version was a Django/Python web app with server-rendered templates, a custom session-based auth system, and a SQLite database. This rewrites it from scratch using Next.js 16 and Supabase, keeping all the features the legacy system had while replacing everything under the hood.

---

## What changed from the old system

| | Before (Django) | Now (Next.js + Supabase) |
|---|---|---|
| Framework | Django 4 (Python) | Next.js 16 (TypeScript) |
| Rendering | Server-rendered HTML templates | React Server Components + client hydration |
| Database | SQLite via Django ORM | PostgreSQL via Supabase |
| Auth | Django's built-in session auth + custom code verification | Supabase Auth — email/password, Google OAuth, OTP reset |
| Password reset | Custom 6-digit code sent by email, verified manually | Supabase OTP with PKCE — secure link, no manual code handling |
| File storage | Local filesystem / Django media | Supabase Storage (S3-compatible) |
| Styling | Custom CSS + Bootstrap | Tailwind CSS + custom design system |
| Deployment | Django dev server | Next.js with Turbopack, deployable to Vercel |

The database schema (theses, colleges, programs, tags, thesis_tags) maps directly from the old Django models. Row-Level Security (RLS) policies are set on all tables so the database enforces access rules, not just the app.

---

## Stack

- **Next.js 16** — App Router, React Server Components, Server Actions
- **TypeScript** — full type coverage across the codebase
- **Supabase** — PostgreSQL database, Auth (email + OAuth), file storage
- **Tailwind CSS** — utility-first styling with a shared CSS design system on top
- **React 19** — useActionState for form actions, Suspense for streaming

---

## Progress report

### Phase 1 — Auth system (Done)

The Django version had its own session middleware, login/logout views, and a custom password reset flow that sent a 6-digit code to email and made the user verify it on a separate page. All of that is replaced by Supabase Auth.

What's implemented:

- `/login` — sign in with email + password or Google OAuth. Supports a `?redirectTo=` param so users land back where they were after signing in.
- `/register` — creates an account with name, email, and password. Supabase sends a confirmation email before the account is active.
- `/forgot-password` — sends a reset link via Supabase's built-in OTP flow. No custom code handling.
- `/reset-password` — receives the PKCE code from the email link, exchanges it for a session, then lets the user set a new password.
- Session refresh — every request passes through a proxy middleware that refreshes the Supabase session from cookies, so users don't get logged out unexpectedly.
- Google OAuth — one button, handled via Supabase's OAuth flow with a callback route at `/auth/callback`.
- All form actions are React 19 Server Actions using `useActionState` — no client-side fetch calls for mutations.

### Phase 2 — Home page and theses listing (Done)

The Django home view fetched a queryset of recent theses and passed it to a template. The theses list view had a basic search filter and pagination. Both are rebuilt as Next.js Server Components that fetch data directly from Supabase in parallel.

What's implemented:

- `/` (home page)
  - Hero section with live counts pulled from Supabase at request time — total theses, colleges, programs, and tags.
  - Program carousel — shows all degree programs, auto-advances every 5 seconds, supports touch swipe and keyboard arrows. Clicking a program filters the thesis grid below it. The active program is stored in the URL (`?program=`) so the page is shareable.
  - Featured thesis grid — shows the 6 most recent theses, or the 6 most recent from the selected program.

- `/theses` (full listing)
  - Search bar — searches title, authors, and abstract using Supabase's `ilike` filter. Query is kept in the URL (`?q=`).
  - Tag filter chips — clicking a tag adds it to the URL (`?tag=`). Multiple tags can be active at once and are combined with AND logic (thesis must have all selected tags).
  - Pagination — 9 results per page, smart page number display with ellipsis when there are many pages.
  - My Theses — when logged in and not searching, your own uploaded theses appear at the top of the page with Edit and Delete links.

### Phase 3 — Thesis upload (To be implemented)

Upload form with PDF upload to Supabase Storage, college and program selectors, tag picker, year, and adviser fields. Server Action with validation. Auto-detection of Semantic Scholar paper ID for recommendations.

### Phase 4 — Thesis detail page (To be implemented)

Full thesis view with abstract, all metadata, and a link to download or view the PDF. View count incremented on each visit. Similar thesis recommendations pulled from the Semantic Scholar API using the stored paper ID.

### Phase 5 — Edit and delete (To be implemented)

Owner-only edit form pre-filled with existing data. Delete with a confirmation step. RLS on the database already enforces ownership — the frontend just needs the UI.

### Phase 6 — Profile page (To be implemented)

User profile showing all uploaded theses and an option to edit the display name.

---

## Folder structure

```
src/
├── app/
│   ├── (auth)/              # /login, /register, /forgot-password, /reset-password
│   ├── actions/auth.ts      # Server Actions for all auth flows
│   ├── auth/                # /auth/callback and /auth/signout route handlers
│   ├── theses/              # /theses listing page
│   ├── globals.css          # Design tokens and shared CSS component classes
│   ├── layout.tsx           # Root layout with Navbar
│   └── page.tsx             # Home page
├── components/
│   ├── Navbar.tsx           # Server Component — reads user server-side, no flash
│   ├── NavbarClient.tsx     # Mobile menu, avatar dropdown, sign-out (client)
│   ├── ThesisCard.tsx       # Reusable card used on home and listing pages
│   ├── ThesisSearch.tsx     # Search input that updates URL params
│   └── ProgramCarousel.tsx  # Program filter carousel
├── lib/
│   ├── data.ts              # All Supabase data-fetching functions
│   ├── semantic-scholar.ts  # Semantic Scholar API integration
│   └── supabase/            # Browser client, server client, middleware client
└── types/
    └── database.ts          # TypeScript types for the Supabase schema

supabase/
└── migrations/
    └── 001_init_schema.sql  # Full schema with RLS policies
```
