// Deno + Stripe
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
// import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts"; // opcional

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const TRIAL_DAYS = Number(Deno.env.get("TRIAL_PERIOD_DAYS") ?? "0") || 0;

// Permite forzar un bypass de la función para pruebas rápidas
// Pon BYPASS_CHECKOUT=1 en supabase/.env para activarlo
const BYPASS_CHECKOUT = (Deno.env.get("BYPASS_CHECKOUT") ?? "0") === "1";

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

  // BYPASS controlado por env (evita exigir Authorization y corta la ejecución)
  if (BYPASS_CHECKOUT) {
    console.log("[CCS] bypass-test activo");
    return json({ ok: "bypass-test" }, 200);
  }

  // ⚠️ Para local no exigimos Authorization; si luego quieres exigir JWT en prod,
  // añade aquí la validación cuando ENV=production.

  type Body = {
    priceId?: string;        // camelCase
    price_id?: string;       // snake_case (compat)
    customerId?: string;
    customer_id?: string;
    customer_email?: string;
    successUrl?: string;
    success_url?: string;
    cancelUrl?: string;
    cancel_url?: string;
  };

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad JSON body" }, 400);
  }

  // Normaliza campos
  const priceId = body.priceId ?? body.price_id;
  const customerId = body.customerId ?? body.customer_id;
  const customerEmail = body.customer_email;
  const successUrl = body.successUrl ?? body.success_url;
  const cancelUrl = body.cancelUrl ?? body.cancel_url;

  if (!priceId || !successUrl || !cancelUrl) {
    return json(
      { error: "Missing fields: priceId, successUrl, cancelUrl (customerId o customer_email son opcionales)" },
      400
    );
  }

  try {
    // Si no viene customerId pero sí email, busca/crea el customer en Stripe
    let finalCustomerId = customerId;
    if (!finalCustomerId && customerEmail) {
      const found = await stripe.customers.search({
        query: `email:'${customerEmail.replace("'", "\\'")}'`,
      });
      finalCustomerId = found.data[0]?.id;
      if (!finalCustomerId) {
        const created = await stripe.customers.create({ email: customerEmail });
        finalCustomerId = created.id;
      }
    }

    // (Opcional) validar en tu DB que finalCustomerId pertenezca al user autenticado
    // const supabase = createSupabaseAdminClient();

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session] error:", msg);
    return json({ error: msg }, 500);
  }
});
