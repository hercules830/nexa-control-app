// supabase/functions/_shared/supabaseUserClient.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

/**
 * Cliente que actúa en nombre del usuario que realiza la petición.
 * Usa el token de autorización del usuario.
 */
export const createSupabaseUserClient = (authHeader: string) => {
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
  // Crea el cliente pasando el header de autorización del usuario
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
};