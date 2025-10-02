// supabase/functions/create-checkout-session/index.ts
// Deno + Stripe
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: {
    priceId?: string;
    customerId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  try {
    payload = await req.json();
  } catch {
    return json({ error: "Bad JSON body" }, 400);
  }

  const { priceId, customerId, successUrl, cancelUrl } = payload;

  if (!priceId || !customerId || !successUrl || !cancelUrl) {
    return json(
      { error: "Missing fields: priceId, customerId, successUrl, cancelUrl" },
      400
    );
  }

  try {
    // opcional: validar que customerId sea del usuario autenticado en tu DB
    // const supabase = createSupabaseAdminClient();

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

    return json({ id: session.id, url: session.url, checkoutUrl: session.url });
  } catch (err: any) {
    console.error("[create-checkout-session] error:", err?.message || err);
    return json({ error: err?.message ?? "Internal error" }, 500);
  }
});