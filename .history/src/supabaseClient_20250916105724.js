// RUTA: src/supabaseClient.js
// REEMPLAZA ESTE ARCHIVO COMPLETO

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// --- INICIO DE LA CORRECCIÓN ---
const localFunctionUrl = 'http://localhost:54321';

const options = {};
// Si estamos en modo de desarrollo (npm run dev), le decimos al cliente
// que use la URL de las funciones locales.
if (import.meta.env.DEV) {
  options.functionsUrl = localFunctionUrl;
}
// --- FIN DE LA CORRECCIÓN ---

// Pasamos las nuevas opciones al crear el cliente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);