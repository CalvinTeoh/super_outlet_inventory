# Super Outlet Inventory

A single-page stock tracker for three café outlets (Tampines, Orchard, Jurong), backed by Supabase.

- One tab per outlet, filterable by category
- Add/remove stock and change reorder levels, then **Save** to write to Supabase
- Items at or below their reorder level are marked **Low**
- **Order from suppliers** tab totals the shortfall across all outlets, with a one-click copy

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app (HTML, CSS and JS in one file) |

No build step and no dependencies.

## Deploy on Vercel

1. In Vercel, **Add New → Project** and import this GitHub repo.
2. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
3. Click **Deploy**. Vercel serves `index.html` at the root URL.

Every push to `main` redeploys automatically.

## Data

The page talks to Supabase directly using the project's publishable key (in `index.html`).
Tables: `outlets`, `items`, `stock_counts`, plus the `latest_stock` view.
Each save upserts a `stock_counts` row for today's date (Singapore time), so earlier counts are kept as history.

The publishable key can read stock and add/update counts but cannot delete. Anyone with the page URL can edit stock levels.
