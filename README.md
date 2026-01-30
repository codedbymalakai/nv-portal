nv-portal

Client portal MVP built with Next.js and Supabase

Users can log in with Supabase Auth and can view service updates that belong to their client account. Access is enforced in the database using **Row Level Security (RLS)**

---

What this portal does (currently):
1. User signs in with email + password (Supabase Auth)
2. Dashboard checks the current session
3. Dashboard fetches `service_updates`
4. Supabase RLS automatically filters rows so the user sees updates only for their client

---

Tech stack:
- Next.js (App Router, Client Components)
- Supabase (Auth + Postgres + RLS)
- TypeScript
- Tailwind + shadcn/ui

---

Database model:
This portal is multi-tenant: multiple companies (clients) can use the same portal, but only see their own data.

Tables:
`Auth.users` (Supabase-managed)
Supabase stores login accounts here

Key column:
- `id` (uuid) - unique user ID
You cannot read passwords from here. Supabase handles passwords securely.

---

`public.profiles
