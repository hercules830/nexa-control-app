// supabase/functions/create-checkout-session/index.ts
// Runtime recomendado por Supabase: Deno.serve
import Stripe from "https://esm.sh/stripe@16?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // puedes poner http://localhost:5173 si quieres restringir
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, customerEmail, customerId, successUrl, cancelUrl } = await req.json();

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
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : customerEmail,
      success_url: successUrl ?? `${new URL(req.url).origin}/billing/success`,
      cancel_url: cancelUrl ?? `${new URL(req.url).origin}/billing/cancel`,
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
