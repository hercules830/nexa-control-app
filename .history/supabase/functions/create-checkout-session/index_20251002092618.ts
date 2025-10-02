// supabase/functions/create-checkout-session/index.ts
// Deno + Supabase Edge Functions
// Requisitos de entorno (en supabase/.env):
//   STRIPE_API_KEY=sk_test_****************************
//   (Opcionales) TRIAL_PERIOD_DAYS=7

import Stripe from "stripe";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // o "http://localhost:5173" si quieres más estricto
  "Vary": "Origin",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-client-origin",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const jsonError = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY");
    if (!STRIPE_API_KEY) {
      return jsonError(500, "Server: missing STRIPE_API_KEY");
    }

    const stripe = new Stripe(STRIPE_API_KEY, {
      apiVersion: "2024-06-20",
    });

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Body must be JSON");
    }

    const priceFromBody = body?.price_id ?? body?.priceId;
    if (!priceFromBody || typeof priceFromBody !== "string") {
      return jsonError(400, "Missing 'price_id' in body");
    }

    // Origen del cliente para construir URLs de retorno
    const origin =
      req.headers.get("x-client-origin") ??
      "http://localhost:5173"; // fallback local

    // Puedes leer el JWT si tu lógica lo requiere (p.ej. para asociar al usuario)
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;
    // (Opcional) validar JWT con Supabase si necesitas proteger la función:
    // const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    // Días de prueba (puedes configurarlos en el Price o aquí)
    const trialDays =
      Number(Deno.env.get("TRIAL_PERIOD_DAYS") || "7") || undefined;

    // Construir sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceFromBody, quantity: 1 }],
      // Si no tienes customer_id guardado, deja que Stripe lo cree:
      customer_creation: "always",
      allow_promotion_codes: true,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      ...(trialDays
        ? { subscription_data: { trial_period_days: trialDays } }
        : {}),
    });

    if (!session?.url) {
      return jsonError(400, "Stripe did not return a session URL");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[create-checkout-session] error:", err);
    const message =
      (err as any)?.message ?? (typeof err === "string" ? err : "Unknown error");
    return new Response(JSON.stringify({ error: String(message) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
