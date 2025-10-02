// supabase/functions/_shared/supabaseAdmin.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

/** Admin client para usarse dentro de Edge Functions (Deno). */
export const createSupabaseAdminClient = () => {
  const url =
    Deno.env.get("EDGE_SUPABASE_URL") ??
    Deno.env.get("SUPABASE_URL") ??
    "";

  const serviceRoleKey =
    Deno.env.get("EDGE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "";

  if (!url || !serviceRoleKey) {
    throw new Error(
      `Faltan variables para el admin client → url="${url}", serviceRoleKey=${serviceRoleKey ? "[present]" : "[missing]"}.
Verifica supabase/.env (local) o Secrets (prod).`
    );
  }

  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
};
