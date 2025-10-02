// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// DEBUG (puedes borrar estos console.log cuando todo funcione)
console.log('[ENV] VITE_SUPABASE_URL =', import.meta.env.VITE_SUPABASE_URL);
console.log(
  '[ENV] VITE_SUPABASE_ANON_KEY =',
  (import.meta.env.VITE_SUPABASE_ANON_KEY || '').slice(0, 12) + '...'
);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const viteVars = Object.fromEntries(
    Object.entries(import.meta.env).filter(([k]) => k.startsWith('VITE_'))
  );
  console.error('VITE vars visibles:', viteVars);
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa tus archivos .env y reinicia Vite.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
