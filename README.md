# Refero

Refero is Palawan State University management system for the College of Sciences — the place where students submit their research and where signed-in members of the university can look up theses by college, program, or topic.

The original version was a Django/Python web app with server-rendered templates, a custom session-based auth system, and a SQLite database. This rewrites it from scratch using Next.js 16 and Supabase, keeping all the features the legacy system had while replacing everything under the hood.

---

## Stack

- **Next.js 16** — App Router, React Server Components, Server Actions
- **TypeScript** — full type coverage, no `any` in the codebase
- **Supabase** — PostgreSQL database, Auth (email + OAuth), file storage
- **Tailwind CSS v4** — utility-first styling with a shared CSS design system on top
- **React 19** — `useActionState` for form actions, Suspense for streaming

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

The database schema (theses, colleges, programs, tags, thesis_tags) maps directly from the old Django models. Row-Level Security policies are set on all tables, so the database enforces access rules rather than trusting the app to do it.

---

## Features

### Authentication

The Django version had its own session middleware, login/logout views, and a password reset flow that emailed a 6-digit code the user had to verify on a separate page. All of that is replaced by Supabase Auth.

- `/login` — email + password or Google OAuth. Accepts `?redirectTo=` so users land back where they were.
- `/register` — creates an account with name, email, and password. Supabase sends a confirmation email before the account activates.
- `/forgot-password` — sends a reset link through Supabase's OTP flow.
- `/reset-password` — exchanges the PKCE code from the email link for a session, then sets the new password.
- Session refresh — every request passes through `proxy.ts`, which refreshes the Supabase session from cookies so users aren't logged out unexpectedly.
- All mutations are Server Actions using `useActionState`. No client-side fetch calls for writes.

### Browsing and search

- `/` — hero with live counts (theses, colleges, programs, tags) read at request time.
- Program carousel — every degree program, with touch swipe and keyboard arrows. It auto-advances every 5 seconds but only until the visitor touches it: hovering pauses it, any manual pick stops it for good, and it never starts when the OS reports `prefers-reduced-motion`. Auto-advance only slides the strip; the URL changes solely on an explicit pick. The active program is stored in the URL (`?program=`) so the page is shareable.
- Featured grid — the 6 most recent theses, or the 6 most recent from the selected program.
- `/theses` — searches title, authors, abstract, and tag names, with the query kept in the URL (`?q=`). Tag filter chips combine with AND logic, evaluated by the `theses_with_all_tags` SQL function. Paginates at 9 per page with an ellipsis window. Signed-in users see their own uploads at the top with edit and delete links.

### Upload, edit, delete

- `/theses/upload` — PDF upload to Supabase Storage, college and program selectors, tag picker (existing tags plus free-text new ones), year, adviser, and panel score. Validation and insert run in one Server Action. PDFs are stored under `<user-id>/<uuid>.pdf` so the Storage policies can key ownership off the folder name.
- `/theses/[id]/edit` — owner-only, pre-filled, reusing the upload form in `edit` mode. Replacing the PDF deletes the old object.
- Delete uses a two-step confirmation and removes the PDF from Storage alongside the row. RLS enforces ownership at the database level; the page's own check just avoids rendering a form that would fail.

### Thesis detail

- `/theses/[id]` — abstract, full metadata, tags, an inline PDF viewer, and a download link. PDF links are time-limited signed URLs, so the Storage bucket stays private.
- View counts increment through the `increment_thesis_views` SQL function — one atomic `UPDATE ... RETURNING`, so concurrent views can't overwrite each other, and no service-role key on the request path.
- Related papers come from Semantic Scholar and stream in behind a `<Suspense>` boundary, so a slow external API never delays the thesis itself.

### Profile

- `/profile` — upload count, total views, average panel score, the user's own theses, and an inline display-name editor backed by a Server Action.

---

## Folder structure

```
src/
├── app/
│   ├── (auth)/              # /login, /register, /forgot-password, /reset-password
│   ├── actions/
│   │   ├── auth.ts          # Server Actions for all auth flows
│   │   └── thesis.ts        # Upload, update, delete
│   ├── auth/                # /auth/callback and /auth/signout route handlers
│   ├── theses/
│   │   ├── page.tsx         # Listing with search, tag filters, pagination
│   │   ├── upload/          # Upload form
│   │   └── [id]/            # Detail page + [id]/edit
│   ├── profile/             # Profile page
│   ├── globals.css          # Design tokens and shared CSS component classes
│   ├── layout.tsx           # Root layout with Navbar
│   ├── page.tsx             # Home page
│   ├── error.tsx            # Route error boundaries (also per-segment)
│   ├── global-error.tsx     # Last-resort boundary, owns its own <html>
│   ├── loading.tsx          # Streaming fallbacks (also per-segment)
│   └── not-found.tsx        # 404, and every unmatched URL
├── components/
│   ├── Navbar.tsx           # Server Component — reads user server-side, no flash
│   ├── NavbarClient.tsx     # Mobile menu, avatar dropdown, sign-out (client)
│   ├── ThesisCard.tsx       # Reusable card used on home and listing pages
│   ├── ThesisSearch.tsx     # Search input that updates URL params
│   ├── ThesisFormClient.tsx # Shared upload/edit form
│   ├── DeleteThesisButton.tsx # Two-step delete confirmation (client)
│   ├── UpdateNameForm.tsx   # Display-name editor (client)
│   ├── AuthCardSkeleton.tsx # Shared auth loading placeholder
│   └── ProgramCarousel.tsx  # Program filter carousel
├── lib/
│   ├── auth.ts              # cache()-wrapped getCurrentUser() — one JWT check per request
│   ├── data.ts              # All Supabase data-fetching functions
│   ├── storage.ts           # Bucket name + signed PDF URLs (server only)
│   ├── semantic-scholar.ts  # Semantic Scholar API integration
│   └── supabase/            # Browser client, server client, admin client, proxy client
└── types/
    └── database.ts          # TypeScript types for the Supabase schema

proxy.ts                     # Next 16's renamed middleware — refreshes the session, guards routes

supabase/
├── migrations/
│   ├── 001_init_schema.sql  # Full schema with RLS policies
│   ├── 002_fixes.sql        # SQL functions, search indexes, Storage bucket + policies
│   ├── 003_scope_colleges.sql # Drops the colleges that had no programs
│   └── 004_college_of_sciences.sql # Consolidates to one college, five programs
└── verify.sql               # Read-only post-migration state check
```

---

## Notes

The service-role Supabase client in `src/lib/supabase/admin.ts` must never be imported into a client component — it bypasses RLS entirely. Only `src/lib/storage.ts` and the thesis Server Actions use it, and both are server-only.

There is no automated test suite yet.
