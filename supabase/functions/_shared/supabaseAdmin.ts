// supabase/functions/_shared/supabaseAdmin.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Estas variables deben existir en supabase/.env
// EDGE_SUPABASE_URL=http://host.docker.internal:54321   (en Windows)
// EDGE_SERVICE_ROLE_KEY=sb_secret_...

const url =
  Deno.env.get("EDGE_SUPABASE_URL") || "http://host.docker.internal:54321";
const serviceKey = Deno.env.get("EDGE_SERVICE_ROLE_KEY") || "";

/**
 * Algunas funciones de tu repo importan un "createSupabaseAdminClient"
 * y otras importan "supabaseAdmin" directo. Exportamos ambos para
 * evitar errores de importación inconsistentes.
 */
export function createSupabaseAdminClient() {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export const supabaseAdmin = createSupabaseAdminClient();
