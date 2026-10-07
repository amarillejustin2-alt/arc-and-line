// SUPABASE CONFIG: paste your values from Supabase > Project Settings > API.
// The anon key is safe in the browser: Row Level Security protects the data.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://vpalsemmojjekocmpdoo.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwYWxzZW1tb2pqZWtvY21wZG9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzIyMjAsImV4cCI6MjEwNjkwODIyMH0.A3jWOrmh1UuIxmJZprjDPTzUn1VZcFmqAqmbuWI_Tm4';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);