import { createClient } from '@supabase/supabase-js'
// Debug temporal (borra luego):
console.log("[ENV] VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
console.log(
  "[ENV] VITE_SUPABASE_ANON_KEY =",
  (import.meta.env.VITE_SUPABASE_ANON_KEY || "").slice(0, 12) + "..."
);


export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
