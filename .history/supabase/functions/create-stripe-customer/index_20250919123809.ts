// index.ts (create-stripe-customer)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // cámbialo por tu dominio si quieres restringir
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "user_id y email son requeridos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
      apiVersion: "2024-06-20",
    });

    // Crea el cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: user_id },
    });

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
