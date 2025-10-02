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
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 🔒 (opcional) Validar Authorization si tienes verify_jwt=true
  // const auth = req.headers.get("Authorization");
  // if (!auth?.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

  // ✅ Manejo robusto del body para evitar "Unexpected end of JSON input"
  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "No se recibió un JSON válido en el body" }, 400);
  }

  try {
    const priceId = body.price_id ?? body.priceId;
    const successUrl = body.success_url ?? body.successUrl;
    const cancelUrl = body.cancel_url ?? body.cancelUrl;

    // customerId opcional, o se resuelve por email
    let customerId = body.customer_id ?? body.customerId;
    const customerEmail = body.customer_email ?? body.customerEmail;

    if (!priceId || !successUrl || !cancelUrl) {
      return json(
        { error: "Faltan campos obligatorios: priceId, successUrl, cancelUrl" },
        400
      );
    }

    // Si no hay customerId pero sí email → busca/crea Customer en Stripe
    if (!customerId && customerEmail) {
      const found = await stripe.customers.search({
        query: `email:'${String(customerEmail).replace("'", "\\'")}'`,
      });
      customerId = found.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({ email: customerEmail });
        customerId = created.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId, // puede ser undefined si no lo resolviste por email
      line_items: [{ price: String(priceId), quantity: 1 }],
      success_url: String(successUrl),
      cancel_url: String(cancelUrl),
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
    });

    // Devolver ambos por compat
    return json({ id: session.id, url: session.url, checkoutUrl: session.url }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session] error:", msg);
    return json({ error: msg }, 500);
  }
});
