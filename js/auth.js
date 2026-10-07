// AUTHENTICATION LOGIC (Supabase Auth handles passwords; we never store them)
import { supabase } from './supabaseClient.js';

export const register = ({ fullName, email, password, phone }) =>
  supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } });
export const login = (email, password) => supabase.auth.signInWithPassword({ email, password });
export async function logout() { await supabase.auth.signOut(); location.href = 'index.html'; }

export async function getUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}
export async function getProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}
// Use at the top of pages that need a logged-in customer
export async function requireLogin() {
  const user = await getUser();
  if (!user) location.href = 'login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
  return user;
}
