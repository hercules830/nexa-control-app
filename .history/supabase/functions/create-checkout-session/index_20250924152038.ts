// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, customerId, successUrl, cancelUrl } = await req.json();
    
    if (!priceId || !customerId) {
      throw new Error("priceId y customerId son requeridos.");
    }

    // --- ¡AQUÍ ESTÁ LA LÓGICA MEJORADA! ---
    // 1. Leemos la variable de entorno para los días de prueba.
    const trialDaysString = Deno.env.get("TRIAL_PERIOD_DAYS");
    // 2. La convertimos a número. Si no existe, usamos 7 como valor por defecto.
    const trialPeriodDays = Number(trialDaysString) || 7;


    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      mode: "subscription",
      subscription_data: {
        // 3. Usamos la variable que acabamos de definir.
        trial_period_days: trialPeriodDays,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error en create-checkout-session:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});