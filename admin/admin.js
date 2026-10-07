// ADMIN DASHBOARD. Real security = Row Level Security in Supabase; the checks here only control what is shown.
import { supabase } from '../js/supabaseClient.js';
import { getUser, getProfile, logout } from '../js/auth.js';
import { money, esc, toast } from '../js/ui.js';
import { SIZES } from '../js/products.js';

const app = document.getElementById('app');
const user = await getUser();
if (!user) location.href = '../login.html?next=admin/index.html';
else if ((await getProfile())?.role !== 'admin') {
  app.innerHTML = '<div class="center"><h1>Unauthorized</h1><p>You need an admin account to open this page.</p><a class="btn" href="../index.html">Back to store</a></div>';
} else start();

const check = (res) => { if (res.error) { alert(res.error.message); throw res.error; } return res; };
async function upload(file) { // Supabase Storage: returns a public URL
  const path = `${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
  check(await supabase.storage.from('product-images').upload(path, file));
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}

function start() {
  const tabs = { dashboard, products, orders, customers, content };
  app.innerHTML = `<header><div class="bar"><a class="logo" href="../index.html">ARC&amp;LINE ADMIN</a><a href="#" id="out">Logout</a></div></header>
    <main><div class="tabs">${Object.keys(tabs).map((t) => `<button class="btn ghost" data-t="${t}">${t}</button>`).join('')}</div><div id="view"></div></main>`;
  document.getElementById('out').onclick = (e) => { e.preventDefault(); logout(); };
  const show = (t) => { app.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); tabs[t](document.getElementById('view')); };
  app.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => show(b.dataset.t));
  show('dashboard');
}

// ---------- DASHBOARD ----------
async function dashboard(v) {
  const count = async (t, f) => { let q = supabase.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); return (await q).count ?? 0; };
  const [prods, custs, ords, pend, paid] = await Promise.all([
    count('products'), count('profiles', (q) => q.eq('role', 'customer')), count('orders'),
    count('orders', (q) => q.eq('order_status', 'pending')),
    supabase.from('orders').select('total').eq('payment_status', 'paid')]);
  const sales = (paid.data || []).reduce((n, o) => n + Number(o.total), 0);
  const s = (l, x) => `<div class="stat"><b>${x}</b>${l}</div>`;
  v.innerHTML = `<h2>Dashboard</h2><div class="stats">${s('Products', prods)}${s('Customers', custs)}${s('Orders', ords)}${s('Pending orders', pend)}${s('Total sales (paid)', money(sales))}</div>`;
}

// ---------- PRODUCTS ----------
async function products(v) {
  const { data } = check(await supabase.from('products').select('*, product_sizes(size, stock)').order('created_at', { ascending: false }));
  v.innerHTML = `<h2>Products</h2><button class="btn" id="new">Add product</button><br><br><div class="scroll"><table>
    <tr><th></th><th>Name</th><th>Price</th><th>Stock by size</th><th>Status</th><th></th></tr>
    ${data.map((p) => `<tr data-id="${p.id}"><td>${p.image_url ? `<img class="thumb-s" src="${esc(p.image_url)}">` : ''}</td><td>${esc(p.name)}</td><td>${money(p.price)}</td>
      <td>${p.product_sizes.map((s) => `${s.size}: ${s.stock}`).join(', ') || '—'}</td><td>${p.active ? 'Active' : 'Inactive'}${p.featured ? ' · Featured' : ''}</td>
      <td><button class="btn ghost ed">Edit</button> <button class="btn ghost tg">${p.active ? 'Deactivate' : 'Activate'}</button> <button class="btn danger del">Delete</button></td></tr>`).join('')}</table></div><div id="form"></div>`;
  document.getElementById('new').onclick = () => productForm(v, null);
  v.querySelectorAll('tr[data-id]').forEach((tr) => {
    const p = data.find((x) => x.id === tr.dataset.id);
    tr.querySelector('.ed').onclick = () => productForm(v, p);
    tr.querySelector('.tg').onclick = async () => { check(await supabase.from('products').update({ active: !p.active }).eq('id', p.id)); products(v); };
    tr.querySelector('.del').onclick = async () => { if (confirm(`Delete "${p.name}" permanently? (Deactivate hides it instead.)`)) { check(await supabase.from('products').delete().eq('id', p.id)); products(v); } };
  });
}

function productForm(v, p) {
  const stock = (s) => p?.product_sizes.find((x) => x.size === s)?.stock ?? '';
  const box = document.getElementById('form');
  box.innerHTML = `<br><form class="form" id="pf"><h2>${p ? 'Edit' : 'Add'} product</h2>
    <label>Name</label><input name="name" value="${esc(p?.name)}" required>
    <label>Price (₱)</label><input name="price" type="number" step="0.01" min="0" value="${p?.price ?? ''}" required>
    <label>Description</label><textarea name="description" rows="4">${esc(p?.description)}</textarea>
    <label>Image ${p?.image_url ? '(leave empty to keep current)' : ''}</label><input name="image" type="file" accept="image/*">
    <label>Stock per size (leave blank if you don't sell that size)</label>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">${SIZES.map((s) => `<div><small>${s}</small><input name="stock_${s}" type="number" min="0" value="${stock(s)}"></div>`).join('')}</div>
    <label><input type="checkbox" name="active" style="width:auto" ${p?.active !== false ? 'checked' : ''}> Active (visible in shop)</label>
    <label><input type="checkbox" name="featured" style="width:auto" ${p?.featured ? 'checked' : ''}> Featured on homepage</label><br>
    <button class="btn">Save product</button></form>`;
  box.scrollIntoView();
  document.getElementById('pf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target;
    const row = { name: f.name.value, description: f.description.value, price: +f.price.value, active: f.active.checked, featured: f.featured.checked, updated_at: new Date().toISOString() };
    if (f.image.files[0]) row.image_url = await upload(f.image.files[0]);
    let id = p?.id;
    if (id) check(await supabase.from('products').update(row).eq('id', id));
    else id = check(await supabase.from('products').insert(row).select().single()).data.id;
    // Replace the size rows with what the form says
    const sizes = SIZES.filter((s) => f['stock_' + s].value !== '').map((s) => ({ product_id: id, size: s, stock: +f['stock_' + s].value }));
    check(await supabase.from('product_sizes').delete().eq('product_id', id));
    if (sizes.length) check(await supabase.from('product_sizes').insert(sizes));
    toast('Saved'); products(v);
  };
}

// ---------- ORDERS ----------
async function orders(v) {
  const { data } = check(await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }));
  const sel = (name, opts, cur) => `<select data-f="${name}">${opts.map((o) => `<option ${o === cur ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  v.innerHTML = `<h2>Orders</h2><div class="scroll"><table><tr><th>Order</th><th>Customer</th><th>Delivery address</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr>
    ${data.map((o) => `<tr data-id="${o.id}"><td><b>${o.order_number}</b><br><small>${new Date(o.created_at).toLocaleString()}</small></td>
      <td>${esc(o.full_name)}<br>${esc(o.email)}<br>${esc(o.phone)}</td><td>${esc(o.address)}, ${esc(o.city)}, ${esc(o.province)} ${esc(o.postal_code)}</td>
      <td>${o.order_items.map((i) => `${esc(i.product_name)} (${i.size}) × ${i.quantity}`).join('<br>')}</td><td>${money(o.total)}<br><small>${esc(o.payment_method)}</small></td>
      <td>${sel('payment_status', ['pending', 'paid', 'failed', 'refunded'], o.payment_status)}</td>
      <td>${sel('order_status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], o.order_status)}</td></tr>`).join('') || '<tr><td colspan="7">No orders yet.</td></tr>'}</table></div>`;
  v.querySelectorAll('select[data-f]').forEach((s) => s.onchange = async () => {
    check(await supabase.from('orders').update({ [s.dataset.f]: s.value }).eq('id', s.closest('tr').dataset.id)); toast('Updated');
  });
}

// ---------- CUSTOMERS ----------
async function customers(v) {
  const [{ data: people }, { data: ords }] = [check(await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false })),
    check(await supabase.from('orders').select('user_id, order_number, total, order_status, created_at').order('created_at', { ascending: false }))];
  v.innerHTML = `<h2>Customers</h2><div class="scroll"><table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Order history</th></tr>
    ${people.map((c) => { const mine = ords.filter((o) => o.user_id === c.id);
      return `<tr><td>${esc(c.full_name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td>${mine.length}</td>
      <td>${mine.map((o) => `${o.order_number} · ${money(o.total)} · ${o.order_status}`).join('<br>') || '—'}</td></tr>`; }).join('')}</table></div>`;
}

// ---------- WEBSITE CONTENT ----------
const FIELDS = [['hero_title', 'Homepage headline'], ['hero_tagline', 'Homepage tagline'], ['hero_description', 'Homepage description', 'area'], ['hero_button', 'Hero button text'],
  ['hero_image', 'Hero image', 'image'], ['about_title', 'About title'], ['about_text', 'About text', 'area'], ['footer_text', 'Footer text'], ['shipping_fee', 'Shipping fee (₱)']];
async function content(v) {
  const { data } = check(await supabase.from('site_content').select('*'));
  const c = Object.fromEntries(data.map((r) => [r.key, r.value]));
  v.innerHTML = `<h2>Website Content</h2><p class="muted">Featured products: tick "Featured on homepage" when editing a product.</p><form class="form" id="cf">
    ${FIELDS.map(([k, l, t]) => `<label>${l}</label>` + (t === 'area' ? `<textarea name="${k}" rows="3">${esc(c[k])}</textarea>`
      : t === 'image' ? `${c[k] ? `<img src="${esc(c[k])}" style="max-width:240px">` : ''}<input type="file" name="${k}" accept="image/*">` : `<input name="${k}" value="${esc(c[k])}">`)).join('')}
    <br><button class="btn">Save content</button></form>`;
  document.getElementById('cf').onsubmit = async (e) => {
    e.preventDefault(); const f = e.target; const rows = [];
    for (const [k, , t] of FIELDS) {
      if (t === 'image') { if (f[k].files[0]) rows.push({ key: k, value: await upload(f[k].files[0]) }); } else rows.push({ key: k, value: f[k].value });
    }
    check(await supabase.from('site_content').upsert(rows)); toast('Saved'); content(v);
  };
}
