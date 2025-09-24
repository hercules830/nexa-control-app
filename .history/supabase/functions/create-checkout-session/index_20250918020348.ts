// index.ts (create-checkout-session)
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
    const body = await req.json();
    const { priceId, customerEmail, customerId, successUrl, cancelUrl } = body ?? {};

    if (!priceId || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "priceId y customerEmail son requeridos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,             // opcional: si ya lo tienes
      customer_email: customerId ? undefined : customerEmail, // si no hay customer, usa email
      success_url: successUrl ?? `${new URL(req.url).origin}/billing/success`,
      cancel_url: cancelUrl ?? `${new URL(req.url).origin}/billing/cancel`,
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
