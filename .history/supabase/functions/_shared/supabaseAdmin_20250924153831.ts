// supabase/functions/_shared/supabaseAdmin.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// NOTA: Esta función asume que tienes las variables de entorno SUPABASE_URL y 
// SUPABASE_SERVICE_ROLE_KEY configuradas como Secrets en tu proyecto.
export const createSupabaseAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}