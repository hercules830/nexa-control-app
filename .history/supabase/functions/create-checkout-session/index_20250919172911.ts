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
    // --- ¡CAMBIO IMPORTANTE AQUÍ! ---
    // Ahora esperamos recibir el customerId desde el frontend.
    const { priceId, customerId, successUrl, cancelUrl } = await req.json();
    
    if (!priceId || !customerId) {
      throw new Error("priceId y customerId son requeridos.");
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      // --- ¡Y LO USAMOS AQUÍ! ---
      // En lugar de 'customer_email', le pasamos el ID del cliente directamente.
      // Esto asegura que Stripe siempre use el cliente correcto.
      customer: customerId,
      mode: "subscription",
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