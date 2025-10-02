// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";

const STRIPE_KEY = Deno.env.get("STRIPE_API_KEY") ?? "";
if (!STRIPE_KEY) {
  console.error("[create-checkout-session] Missing STRIPE_API_KEY in env");
}

const stripe = new Stripe(STRIPE_KEY, {
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
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!STRIPE_KEY) {
    return json({ error: "Server misconfigured: STRIPE_API_KEY is missing" }, 500);
  }

  try {
    const body = await req.json();

    const priceId = body.priceId ?? body.price_id;
    const successUrl = body.successUrl ?? body.success_url;
    const cancelUrl  = body.cancelUrl ?? body.cancel_url;
    let customerId   = body.customerId ?? body.customer_id;
    const customerEmail = body.customerEmail ?? body.customer_email;

    if (!priceId || !successUrl || !cancelUrl) {
      return json({ error: "Faltan campos: priceId, successUrl, cancelUrl" }, 400);
    }

    // Si no hay customerId pero sí email → buscar/crear
    if (!customerId && customerEmail) {
      const found = await stripe.customers.search({ query: `email:'${customerEmail.replace("'", "\\'")}'` });
      customerId = found.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({ email: customerEmail });
        customerId = created.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: String(priceId), quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
    });

    // 👈 devuelve la clave que espera el front
    return json({ id: session.id, checkoutUrl: session.url }, 200);
  } catch (err: any) {
    const msg = err?.message || String(err);
    // Intenta mostrar la causa real de Stripe (p.ej. "No such price")
    console.error("[create-checkout-session] error:", msg, err?.raw || "");
    return json({ error: msg }, 500);
  }
});
