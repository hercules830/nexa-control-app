// supabase/functions/create-stripe-customer/index.ts
// Crea (si no existe) un customer en Stripe y lo guarda en profiles.stripe_customer_id
// Requiere: STRIPE_API_KEY, EDGE_SUPABASE_URL, EDGE_SERVICE_ROLE_KEY

import Stripe from "npm:stripe@16.6.0";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY");
    if (!STRIPE_API_KEY) return json(500, { error: "Server: missing STRIPE_API_KEY" });

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: "2024-06-20" });

    // Obtener usuario del JWT (Authorization: Bearer <token>)
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) return json(401, { error: "Missing Bearer token" });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !user) return json(401, { error: "Invalid session" });

    // Leer perfil
    const { data: profile, error: qErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (qErr && qErr.code !== "PGRST116") {
      console.error("[create-stripe-customer] query error:", qErr);
      return json(500, { error: "DB error fetching profile" });
    }

    if (profile?.stripe_customer_id) {
      return json(200, { customerId: profile.stripe_customer_id });
    }

    // Crear customer en Stripe
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || undefined,
      name: profile?.full_name || user.user_metadata?.full_name || undefined,
      metadata: { user_id: user.id },
    });

    // Guardar en profiles
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user.id);

    if (upErr) {
      console.error("[create-stripe-customer] update error:", upErr);
      return json(500, { error: "DB error saving customer id" });
    }

    return json(200, { customerId: customer.id });
  } catch (err) {
    console.error("[create-stripe-customer] error:", err);
    return json(400, { error: String((err as any)?.message || err) });
  }
});
