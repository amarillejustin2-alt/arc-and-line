-- ARC&LINE DATABASE: paste this whole file into Supabase > SQL Editor > Run.

-- ========== TABLES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text, price numeric(10,2) not null check (price >= 0),
  image_url text, active boolean default true, featured boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null, stock int not null default 0 check (stock >= 0),
  unique (product_id, size)
);
create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null, quantity int not null default 1 check (quantity > 0),
  created_at timestamptz default now(),
  unique (user_id, product_id, size)
);
create sequence public.order_number_seq start 1001;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_number text unique default ('AL-' || nextval('public.order_number_seq')),
  full_name text, email text, phone text, address text, city text, province text, postal_code text,
  payment_method text,
  subtotal numeric(10,2), shipping_fee numeric(10,2), total numeric(10,2),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  order_status text not null default 'pending' check (order_status in ('pending','processing','shipped','delivered','cancelled')),
  created_at timestamptz default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text, size text, quantity int, price numeric(10,2)
);
-- Editable website text/images (key/value)
create table public.site_content (key text primary key, value text);

insert into public.site_content (key, value) values
 ('hero_title','ARC&LINE'),
 ('hero_tagline','DEFINED BY THE GAME.'),
 ('hero_description','Basketball-inspired streetwear made for those who move differently.'),
 ('hero_button','SHOP NOW'),
 ('hero_image',''),
 ('about_title','About Arc&Line'),
 ('about_text','Arc&Line is a streetwear brand built on basketball culture, street fashion and hip-hop. Every piece is made for the court, the block and everywhere in between.'),
 ('footer_text','© Arc&Line. Defined by the game.'),
 ('shipping_fee','100');

-- ========== HELPER FUNCTIONS ==========
-- Returns the logged-in user's role (security definer avoids RLS recursion)
create function public.my_role() returns text language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(public.my_role() = 'admin', false) $$;

-- Auto-create a profile whenever someone registers
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'phone');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Checkout: builds the order on the SERVER using real prices and stock (customers can't fake totals)
create function public.create_order(p_full_name text, p_email text, p_phone text, p_address text, p_city text,
  p_province text, p_postal_code text, p_payment_method text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_sub numeric := 0; v_ship numeric; v_id uuid; r record;
begin
  if uid is null then raise exception 'Please log in first'; end if;
  if not exists (select 1 from cart_items where user_id = uid) then raise exception 'Your cart is empty'; end if;
  for r in select c.quantity, c.size, p.name, p.price, ps.stock
           from cart_items c join products p on p.id = c.product_id and p.active
           left join product_sizes ps on ps.product_id = c.product_id and ps.size = c.size
           where c.user_id = uid loop
    if r.stock is null or r.stock < r.quantity then raise exception 'Not enough stock for % (%)', r.name, r.size; end if;
    v_sub := v_sub + r.price * r.quantity;
  end loop;
  select coalesce((select value::numeric from site_content where key = 'shipping_fee'), 0) into v_ship;
  insert into orders (user_id, full_name, email, phone, address, city, province, postal_code, payment_method, subtotal, shipping_fee, total)
  values (uid, p_full_name, p_email, p_phone, p_address, p_city, p_province, p_postal_code, p_payment_method, v_sub, v_ship, v_sub + v_ship)
  returning id into v_id;
  insert into order_items (order_id, product_id, product_name, size, quantity, price)
    select v_id, c.product_id, p.name, c.size, c.quantity, p.price from cart_items c join products p on p.id = c.product_id where c.user_id = uid;
  update product_sizes ps set stock = ps.stock - c.quantity from cart_items c
    where c.user_id = uid and ps.product_id = c.product_id and ps.size = c.size;
  delete from cart_items where user_id = uid;
  return v_id;
end $$;
grant execute on function public.create_order to authenticated;

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.site_content enable row level security;

-- profiles: own row or admin. Customers can't change their own role.
create policy "profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profile update own" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role());
create policy "profile admin update" on public.profiles for update using (public.is_admin());

-- products & sizes: everyone sees active products; admin manages all
create policy "products read" on public.products for select using (active or public.is_admin());
create policy "products admin" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "sizes read" on public.product_sizes for select using (true);
create policy "sizes admin" on public.product_sizes for all using (public.is_admin()) with check (public.is_admin());

-- cart: only your own
create policy "cart own" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: read your own; admin reads/updates all. Customers can't insert (they use create_order()).
create policy "orders read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "orders admin update" on public.orders for update using (public.is_admin());
create policy "items read" on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

-- site content: everyone reads, admin edits
create policy "content read" on public.site_content for select using (true);
create policy "content admin" on public.site_content for all using (public.is_admin()) with check (public.is_admin());

-- ========== STORAGE (product & hero images) ==========
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
create policy "images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "images admin write" on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin()) with check (bucket_id = 'product-images' and public.is_admin());

-- ========== MAKE YOURSELF ADMIN ==========
-- 1) Register on the website normally. 2) Then run this with YOUR email:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
