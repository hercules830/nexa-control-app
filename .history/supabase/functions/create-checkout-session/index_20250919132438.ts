// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0";
import { corsHeaders } from "../_shared/cors.ts";

// Esta parte ya era correcta, está usando la clave de API correcta
const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY") as string, {
  apiVersion: "2022-11-15",
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = await req.json();

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
    // En lugar de enviar solo el ID de la sesión, ahora enviamos la URL completa
    // que el frontend necesita para la redirección.
    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});