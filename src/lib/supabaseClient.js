import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isUrlValid = (url) => {
    try { return new URL(url); }
    catch (e) { return false; }
};

const validUrl = isUrlValid(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co';
const validKey = supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' ? supabaseAnonKey : 'placeholder';

if (!isUrlValid(supabaseUrl)) {
    console.warn('Invalid or missing Supabase URL in .env. Using placeholder.');
}

export const supabase = createClient(validUrl, validKey);
