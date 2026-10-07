// PRODUCT QUERIES + product card HTML
import { supabase } from './supabaseClient.js';
import { addToCart } from './cart.js';
import { money, esc, toast } from './ui.js';

const ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const SIZES = ORDER;
const sortSizes = (p) => { p.product_sizes.sort((a, b) => ORDER.indexOf(a.size) - ORDER.indexOf(b.size)); return p; };

// Active products from Supabase (featured only if asked)
export async function fetchProducts({ featured = false, limit = null } = {}) {
  let q = supabase.from('products').select('*, product_sizes(size, stock)').eq('active', true).order('created_at', { ascending: false });
  if (featured) q = q.eq('featured', true);
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) console.error(error);
  return (data || []).map(sortSizes);
}
export async function fetchProduct(id) {
  const { data } = await supabase.from('products').select('*, product_sizes(size, stock)').eq('id', id).maybeSingle();
  return data ? sortSizes(data) : null;
}

export const productImage = (p) => p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="img-ph">ARC&amp;LINE</div>`;

function card(p) {
  const inStock = p.product_sizes.filter((s) => s.stock > 0);
  const total = p.product_sizes.reduce((n, s) => n + s.stock, 0);
  return `<article class="card" data-id="${p.id}">
    <a href="product.html?id=${p.id}" class="thumb">${productImage(p)}</a>
    <h3>${esc(p.name)}</h3>
    <p class="price">${money(p.price)}</p>
    <p class="muted">Sizes: ${inStock.map((s) => s.size).join(' / ') || '—'}</p>
    <p class="${total ? 'ok' : 'out'}">${total ? (total <= 5 ? `Only ${total} left` : 'In stock') : 'Sold out'}</p>
    ${total ? `<select class="size">${inStock.map((s) => `<option>${s.size}</option>`).join('')}</select>` : ''}
    <div class="row"><button class="btn add" ${total ? '' : 'disabled'}>Add to Cart</button>
    <a class="btn ghost" href="product.html?id=${p.id}">View Product</a></div></article>`;
}

export function renderGrid(el, products) {
  el.innerHTML = products.length ? products.map(card).join('') : '<p class="muted">No products yet. Add some in the admin dashboard.</p>';
  el.querySelectorAll('.card .add').forEach((btn) => btn.addEventListener('click', async () => {
    const c = btn.closest('.card');
    if (await addToCart(c.dataset.id, c.querySelector('.size').value, 1)) { toast('Added to cart'); }
  }));
}
