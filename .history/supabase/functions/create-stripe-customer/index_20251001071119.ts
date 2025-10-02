// supabase/functions/create-stripe-customer/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_KEY   = Deno.env.get("STRIPE_API_KEY");

console.log("[ENV] SUPABASE_URL =", SUPABASE_URL);
console.log("[ENV] STRIPE_API_KEY prefix =", (STRIPE_KEY ?? "").slice(0, 7));

const stripe = new Stripe(STRIPE_KEY ?? "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing Authorization Bearer token" }, 401);
    }
    const jwt = authHeader.slice("Bearer ".length);

    const admin = createSupabaseAdminClient();
    const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !user) return json({ error: "Invalid JWT" }, 401);

    const { data: existingProfile, error: selErr } = await admin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (selErr) {
      console.error("[create-customer] select profiles error:", selErr);
      return json({ error: selErr.message }, 500);
    }

    if (!existingProfile) {
      const { error: upsertErr } = await admin
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
      if (upsertErr) {
        console.error("[create-customer] upsert profiles error:", upsertErr);
        return json({ error: upsertErr.message }, 500);
      }
    } else if (existingProfile.stripe_customer_id) {
      return json({ customerId: existingProfile.stripe_customer_id }, 200);
    }

    if (!STRIPE_KEY) {
      return json({ error: "STRIPE_API_KEY missing in environment" }, 500);
    }

    let customerId: string | null = null;

    if (user.email) {
      const found = await stripe.customers.list({ email: user.email, limit: 1 });
      if (found.data.length > 0) {
        customerId = found.data[0].id;
        console.log(`[stripe] existing ${user.email}: ${customerId}`);
      }
    }

    if (!customerId) {
      const created = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = created.id;
      console.log(`[stripe] created ${user.email}: ${customerId}`);
    }

    const { error: updErr } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (updErr) {
      console.error("[create-customer] update profiles error:", updErr);
      return json({ error: updErr.message }, 500);
    }

    return json({ customerId }, 200);
  } catch (err: any) {
    console.error("❌ create-stripe-customer:", err?.message || err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});
