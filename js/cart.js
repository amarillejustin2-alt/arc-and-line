// CART LOGIC (rows live in the cart_items table, linked to the logged-in user)
import { supabase } from './supabaseClient.js';
import { getUser, requireLogin } from './auth.js';

export async function addToCart(productId, size, qty = 1) {
  const user = await requireLogin();
  if (!user) return false;
  const { data: existing } = await supabase.from('cart_items').select('id, quantity')
    .eq('user_id', user.id).eq('product_id', productId).eq('size', size).maybeSingle();
  const { error } = existing
    ? await supabase.from('cart_items').update({ quantity: existing.quantity + qty }).eq('id', existing.id)
    : await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, size, quantity: qty });
  if (error) { alert(error.message); return false; }
  return true;
}
export async function getCart() {
  const user = await getUser();
  if (!user) return [];
  const { data } = await supabase.from('cart_items')
    .select('id, size, quantity, product_id, products(name, price, image_url)')
    .eq('user_id', user.id).order('created_at');
  return data || [];
}
export const updateQty = (id, quantity) => supabase.from('cart_items').update({ quantity }).eq('id', id);
export const removeItem = (id) => supabase.from('cart_items').delete().eq('id', id);
export async function cartCount() { return (await getCart()).reduce((n, i) => n + i.quantity, 0); }
export async function getShippingFee() {
  const { data } = await supabase.from('site_content').select('value').eq('key', 'shipping_fee').maybeSingle();
  return Number(data?.value || 0);
}
