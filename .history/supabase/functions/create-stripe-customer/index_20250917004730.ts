// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
});

serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Requiere JWT (protegido por Supabase). No quitar el header Authorization en el fetch del frontend.
    const jwt = req.headers.get("authorization") ?? "";
    if (!jwt.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "missing Authorization Bearer token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { user_id, email } = await req.json();
    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "missing user_id or email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Crear cliente en Stripe (idempotente a nivel app; tú controlas que no se llame 2 veces)
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_uid: user_id },
    });

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-stripe-customer error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
