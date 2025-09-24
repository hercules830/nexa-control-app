// supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// --- ¡AQUÍ ESTÁ LA CORRECCIÓN PRINCIPAL! ---
// Cambiamos la URL de importación a una versión más reciente y específica para Deno
import Stripe from "https://esm.sh/stripe@16?target=deno"; 
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  // Es una buena práctica especificar la versión del API de Stripe que usas
  apiVersion: "2024-06-20",
  // Esta configuración es importante para que la librería sepa cómo hacer las llamadas HTTP en Deno
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = await req.json();

    if (!priceId) {
      throw new Error("El ID del precio (priceId) es requerido.");
    }

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

    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400, // Devolvemos 400 en caso de error de lógica, como un priceId inválido
    });
  }
});