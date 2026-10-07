// SHARED UI: header, footer, toast, editable site text
import { supabase } from './supabaseClient.js';
import { getProfile, logout } from './auth.js';
import { cartCount } from './cart.js';

export const money = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 });
// Escape text before putting it into HTML (prevents script injection)
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// Website text/images edited in Admin > Website Content
export async function loadContent() {
  const { data } = await supabase.from('site_content').select('key, value');
  return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
}

// Call on every customer page. Builds header/footer and fills [data-content="key"] elements.
export async function initLayout() {
  const [profile, content, count] = await Promise.all([getProfile(), loadContent(), cartCount()]);
  document.getElementById('site-header').innerHTML = `
    <div class="bar">
      <a class="logo" href="index.html">ARC&amp;LINE</a>
      <button class="menu-btn" aria-label="Menu" id="menu-btn">☰</button>
      <nav id="nav">
        <a href="index.html">Home</a><a href="shop.html">Shop</a><a href="about.html">About</a>
        <a href="cart.html">Cart (${count})</a>
        ${profile ? `<a href="account.html">Account</a>
          ${profile.role === 'admin' ? '<a href="admin/index.html">Admin</a>' : ''}
          <a href="#" id="logout">Logout</a>` : '<a href="login.html">Login / Register</a>'}
      </nav>
    </div>`;
  document.getElementById('menu-btn').onclick = () => document.getElementById('nav').classList.toggle('open');
  document.getElementById('logout')?.addEventListener('click', (e) => { e.preventDefault(); logout(); });
  document.getElementById('site-footer').innerHTML = `<p data-content="footer_text"></p>`;
  document.querySelectorAll('[data-content]').forEach((el) => { if (content[el.dataset.content]) el.textContent = content[el.dataset.content]; });
  return content;
}
