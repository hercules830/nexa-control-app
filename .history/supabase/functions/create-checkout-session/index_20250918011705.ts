// supabase/functions/create-checkout-session/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // 1) Responder el preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = await req.json();

    if (!priceId || !customerEmail) {
      return new Response(
        JSON.stringify({ error: "priceId y customerEmail son requeridos" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      success_url: successUrl ?? `${new URL(req.url).origin}/billing/success`,
      cancel_url: cancelUrl ?? `${new URL(req.url).origin}/billing/cancel`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
