# Shambhu Car Parking

Digital entry/exit register with admin login, Supabase-backed data, and a public
WhatsApp-shareable ticket page. Next.js 14 (App Router) + Tailwind + Supabase.

## 1. Create your Supabase project
1. Go to https://supabase.com → New project.
2. In the SQL editor, paste and run the contents of `supabase/schema.sql`.
   This creates `parking_sessions` and `parking_rates`, seeds default rates
   (edit them afterwards to match your real pricing — see PRD section 11),
   and sets up Row Level Security.
3. Go to Authentication → Users → **Add user**, and create your operator
   login (email + password). That's the admin account for `/login`.

## 2. Configure environment variables
Copy `.env.local.example` to `.env.local` and fill in your project's URL and
anon key (Supabase dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run locally
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` — you'll land on `/login`.

## 4. Deploy
- **Vercel**: import this folder as a project, add the two env vars above
  in Project Settings → Environment Variables, deploy.
- **Lovable**: import this repo/folder as a Next.js project and add the same
  two env vars in its environment settings.

## How it's structured
- `app/login` — admin sign-in (Supabase Auth)
- `app/(app)/*` — protected operator screens: dashboard, entry, exit, history, rates
- `app/ticket/[token]` — public tracking page, no login required
- `middleware.ts` — redirects signed-out visitors to `/login`; everything
  under `/ticket/*` stays public
- `lib/helpers.ts` — fee calculation, WhatsApp click-to-chat links, formatting
- `supabase/schema.sql` — tables + RLS policies; re-run safely, it's idempotent

## Notes on the current setup (v1)
- **RLS**: any signed-in user can read/write all sessions and rates — there's
  no per-operator role yet. Add a `staff` table with a `role` column if you
  need that later.
- **Public ticket access**: the tracking page relies on the token being hard
  to guess (12 hex chars) rather than a scoped RLS policy, matching the PRD's
  "no login for drivers" requirement. Fine for v1; tighten later with a
  `SECURITY DEFINER` function if you want a stricter guarantee.
- **WhatsApp**: uses `wa.me` click-to-chat — no paid API or webhook needed.
- Out of scope for v1 (per the PRD): SMS, email, online payment, customer
  accounts, GPS, number-plate recognition.
