// functions/create-checkout-session/index.ts

import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const TRIAL_DAYS = Number(Deno.env.get("TRIAL_PERIOD_DAYS") ?? "0") || 0;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    const priceId = body.price_id ?? body.priceId;
    const customerEmail = body.customer_email ?? body.customerEmail;
    const successUrl = body.success_url ?? body.successUrl;
    const cancelUrl = body.cancel_url ?? body.cancelUrl;

    if (!priceId || !successUrl || !cancelUrl) {
      return json({ error: "Faltan campos obligatorios: priceId, successUrl, cancelUrl" }, 400);
    }

    let customerId = body.customer_id ?? body.customerId;

    // Si no existe customerId pero sí email → buscar/crear customer
    if (!customerId && customerEmail) {
      const found = await stripe.customers.search({
        query: `email:'${customerEmail.replace("'", "\\'")}'`,
      });
      customerId = found.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({ email: customerEmail });
        customerId = created.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
    });

    return json({ id: session.id, url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session] error:", msg);
    return json({ error: msg }, 500);
  }
});
