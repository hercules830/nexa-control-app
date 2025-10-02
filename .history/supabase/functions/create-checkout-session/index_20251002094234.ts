// supabase/functions/create-checkout-session/index.ts
// Crea la sesión de Stripe Checkout para suscripciones.
// Espera body: { priceId, customerId, successUrl, cancelUrl }
// Devuelve: { checkoutUrl }

import Stripe from "npm:stripe@16.6.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-client-origin",
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Body must be JSON" });
    }

    const priceId: string | undefined = body?.priceId;
    const customerId: string | undefined = body?.customerId;
    const successUrl: string | undefined = body?.successUrl;
    const cancelUrl: string | undefined = body?.cancelUrl;

    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return json(400, { error: "Missing or invalid 'priceId'" });
    }

    const origin = req.headers.get("x-client-origin") ?? "http://localhost:5173";
    const success = successUrl || `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel = cancelUrl || `${origin}/pricing`;
    const trialDays = Number(Deno.env.get("TRIAL_PERIOD_DAYS") || "7") || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: success,
      cancel_url: cancel,
      ...(customerId ? { customer: customerId } : { customer_creation: "always" }),
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
    });

    if (!session?.url) return json(400, { error: "Stripe did not return a session URL" });

    return json(200, { checkoutUrl: session.url });
  } catch (err) {
    console.error("[create-checkout-session] error:", err);
    return json(400, { error: String((err as any)?.message || err) });
  }
});
