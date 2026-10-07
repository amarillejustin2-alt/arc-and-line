# Arc&Line store (HTML/CSS/JS + Supabase)

## Setup (about 15 minutes)
1. Create a project at supabase.com.
2. SQL Editor > paste `supabase/schema.sql` > Run. (Creates tables, security rules, image bucket.)
3. Project Settings > API: copy the URL and anon key into `js/supabaseClient.js`.
4. Authentication > Providers > Email: turn OFF "Confirm email" while testing.
5. In VS Code install **Live Server**, right-click `index.html` > Open with Live Server (modules need a server, not double-click).
6. Register on the site, then run in SQL Editor: `update public.profiles set role='admin' where email='YOUR EMAIL';`
7. Open `/admin/index.html`. Add products, upload images, edit homepage text.

## Folders
- `*.html` customer pages (home, shop, product, cart, checkout, login/register, account, about)
- `admin/` admin dashboard (`admin.js` holds all admin logic)
- `js/auth.js` login/register · `js/cart.js` cart · `js/products.js` product queries/cards · `js/payment.js` payment hook · `js/ui.js` header/footer · `js/supabaseClient.js` config
- `supabase/schema.sql` database + Row Level Security + storage rules
- `css/style.css` all styling (colors at the top)

## Payments: not connected yet
Checkout creates the order (payment status "pending") and stock is deducted. `js/payment.js` explains how to connect PayMongo/Xendit/Maya through a Supabase Edge Function + webhook. Until then, mark orders "paid" manually in Admin > Orders.
