// supabase/functions/create-checkout-session/index.ts

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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // Parse robusto del body
    const ct = req.headers.get("content-type")?.toLowerCase() ?? "";
    let body: Record<string, any> = {};

    if (ct.includes("application/json")) {
      // si viene vacío -> {} en vez de lanzar
      const raw = await req.text();
      body = raw ? JSON.parse(raw) : {};
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      form.forEach((v, k) => (body[k] = v));
    } else {
      // nada declarado: intenta leer texto y parsear si se puede
      const raw = await req.text();
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    // Normalización de campos (acepta snake y camel)
    const priceId      = body.priceId       ?? body.price_id;
    const customerId   = body.customerId    ?? body.customer_id;
    const customerEmail= body.customerEmail ?? body.customer_email;
    const successUrl   = body.successUrl    ?? body.success_url;
    const cancelUrl    = body.cancelUrl     ?? body.cancel_url;

    if (!priceId || !successUrl || !cancelUrl) {
      return json(
        { error: "Faltan campos: priceId, successUrl y cancelUrl son obligatorios" },
        400,
      );
    }

    // Si no hay customerId pero sí email, busca/crea
    let finalCustomerId = customerId as string | undefined;
    if (!finalCustomerId && customerEmail) {
      const found = await stripe.customers.search({
        query: `email:'${String(customerEmail).replace("'", "\\'")}'`,
      });
      finalCustomerId = found.data[0]?.id;
      if (!finalCustomerId) {
        const created = await stripe.customers.create({ email: customerEmail });
        finalCustomerId = created.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: finalCustomerId, // puede ir undefined
      line_items: [{ price: String(priceId), quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
    });

    return json({ id: session.id, url: session.url, checkoutUrl: session.url }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session] error:", msg);
    return json({ error: msg }, 500);
  }
});
