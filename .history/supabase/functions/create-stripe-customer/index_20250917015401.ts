// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

// ========= Config =========
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
});

// Orígenes permitidos (ajusta el de producción)
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://nexa-control-app.vercel.app",
]);

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const { user_id, email } = await req.json();
    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Faltan user_id o email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
      );
    }

    // Crea cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_uid: user_id },
    });

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  } catch (err) {
    console.error("Error Stripe:", err);
    return new Response(
      JSON.stringify({ error: "stripe_error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } },
    );
  }
});
