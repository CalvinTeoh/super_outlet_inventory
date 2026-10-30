# Super Outlet Inventory

A single-page stock tracker for three café outlets (Tampines, Orchard, Jurong), backed by Supabase.

- Sign in with a username and password (Supabase Auth); sign out and change your own password
- One tab per outlet, filterable by category
- Add/remove stock and change reorder levels, then **Save** to write to Supabase (each save records who made it)
- Items at or below their reorder level are marked **Low**
- **Order from suppliers** tab totals the shortfall across all outlets, with a one-click copy
- **Users** tab (admins only): add users with an initial password, reset passwords

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app (HTML, CSS and JS in one file) |
| `supabase/functions/admin-users/index.ts` | Edge Function source for adding users and resetting passwords (already deployed; not served by Vercel) |
| `.vercelignore` | Keeps the Supabase source and README out of the Vercel deployment |

No build step. The page loads `@supabase/supabase-js` from jsDelivr.

## Deploy on Vercel

1. In Vercel, **Add New → Project** and import this GitHub repo.
2. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
3. Click **Deploy**. Vercel serves `index.html` at the root URL.

Every push to `main` redeploys automatically.

## Users and sign-in

Users live in Supabase's built-in `auth.users` table. Each username signs in as
`<username>@superoutlet.local` behind the scenes, so people only type their username.

`public.profiles` links each auth user to a username and a role:

| Role | Can do |
|---|---|
| `staff` | View stock, save stock and reorder levels |
| `admin` | Everything staff can, plus add users and reset passwords |

Starting users: **Calvin** (admin), **Kelly**, **Jek**, **Zen** (staff). Ask each person to change
the starting password after their first sign-in (header → **Change password**).

## Data and security

Tables: `outlets`, `items`, `stock_counts` (with `updated_by`), `profiles`, plus the `latest_stock` view.
Each save upserts a `stock_counts` row for today's date (Singapore time), so earlier counts are kept as history.

Row Level Security allows access only to signed-in users who have a profile. Accounts that sign
themselves up through the API get no profile, so they see nothing. Only admins can delete counts or
change outlets and items. Creating users needs the service role, so it runs in the `admin-users`
Edge Function, which checks that the caller is an admin.
