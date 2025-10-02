// supabase/functions/_shared/supabaseAdmin.ts
// Cliente de administración para usar dentro de Edge Functions (Deno).
// Lee primero los alias EDGE_* para el entorno local (CLI),
// y si no existen, usa las variables SUPABASE_* (deployment).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4?target=deno";

/**
 * Crea un cliente de Supabase con la Service Role Key.
 * - En local: usa EDGE_SUPABASE_URL y EDGE_SERVICE_ROLE_KEY (definidos en supabase/.env de la CLI).
 * - En producción (deploy): usa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (Secrets del proyecto).
 */
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
    // Devolvemos un error claro para facilitar el debug si faltan envs
    throw new Error(
      "Faltan variables de entorno para el admin client: " +
        `url="${url}", serviceRoleKey="${serviceRoleKey ? "[present]" : ""}". ` +
        "Verifica tu supabase/.env en local y los Secrets en el proyecto."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
};
