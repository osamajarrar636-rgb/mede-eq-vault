# MedEq Vault

**Private Medical Equipment Knowledge Base** — a production-oriented React + TypeScript + Vite application backed by Supabase Auth, PostgreSQL, RLS, private Storage, approval workflow, notifications and audit logging.

## Included

- Email/password Supabase Authentication and password reset
- ADMIN / CONTRIBUTOR / VIEWER roles enforced in PostgreSQL RLS
- Equipment library and technical dossier pages
- Repair cases, troubleshooting, spare parts, manuals and media models
- Contributor submission workflow: pending → approved / rejected / changes requested
- Admin Approval Center backed by a security-definer Postgres RPC
- Private Supabase Storage buckets and signed downloads
- Notifications and audit log
- Global search across equipment, repairs, spare parts and manuals
- Responsive desktop/tablet/mobile UI
- Tuttnauer Valueklave 1730 seed record using only supplied technical values

## 1. Local setup

Requirements: Node.js 20+, npm, a Supabase project.

```bash
cp .env.example .env.local
npm install
npm run dev
```

The supplied project URL and publishable key are already in `.env.example`. The publishable key is safe for a frontend only when PostgreSQL RLS is correctly configured. **Never add a service_role key to `.env.local` or browser code.**

## 2. Supabase setup

Open Supabase SQL Editor and run:

1. `supabase/migrations/001_initial.sql`
2. Create your first account from the application's `/login` flow using Supabase Auth, or from the Supabase dashboard.
3. Promote that first account to ADMIN in SQL:

```sql
update public.profiles
set role='ADMIN'
where email='YOUR_ADMIN_EMAIL';
```

4. Run `supabase/seed.sql`.

The first ADMIN creation is intentionally the only manual step because creating an Auth user securely requires the Supabase Auth admin API / service-role credential, which must never be shipped to the browser.

## 3. Storage

The migration creates private buckets:

- manuals
- photos
- videos
- schematics
- documents
- avatars

Storage policies are private and approval-aware for equipment-linked technical files. Files are uploaded through the authenticated Supabase client and opened with short-lived signed URLs.

## 4. RLS security model

- VIEWER: reads approved content only.
- CONTRIBUTOR: reads approved content and their own pending records; can create pending contributions.
- ADMIN: full technical/content administration.
- Approval is performed by `public.review_submission(...)`, a SECURITY DEFINER Postgres function that checks `is_admin()` server-side.
- Frontend role checks are UX controls only; database RLS is the security boundary.

## 5. Deployment

Build:

```bash
npm run build
```

Deploy the generated `dist/` folder to Vercel, Netlify, Cloudflare Pages, or any static host. Add the two `VITE_` environment variables in the host's environment settings.

For SPA routing, configure all unknown paths to serve `index.html`.

## 6. Important production notes

- Enable an appropriate Supabase Auth email provider and SMTP in the Supabase dashboard before relying on password-reset emails in production.
- Review Storage limits and database backups according to your organization's requirements.
- Medical/engineering documentation may be sensitive; keep the Supabase project private, use least-privilege access, and review retention policies.
- The supplied seed data does not invent unknown part numbers or unsupported specifications; unknown fields are displayed as `Not specified` in the UI.
