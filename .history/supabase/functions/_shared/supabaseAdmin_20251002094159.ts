// supabase/functions/_shared/supabaseAdmin.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("EDGE_SUPABASE_URL") || "http://host.docker.internal:54321";
const serviceKey = Deno.env.get("EDGE_SERVICE_ROLE_KEY") || "";

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false }
});
