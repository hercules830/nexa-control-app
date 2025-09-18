// RUTA: supabase/functions/create-checkout-session/index.ts
// REEMPLAZA ESTE ARCHIVO COMPLETO

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import Stripe from "https://esm.sh/stripe@10.12.0";

// --- INICIO DE LA CORRECCIÓN ---
// Creamos un objeto con los encabezados de CORS para reutilizarlo.
// Esto le dice al navegador que permita solicitudes desde cualquier origen (*).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
// --- FIN DE LA CORRECCIÓN ---

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-08-01",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // --- AÑADIMOS MANEJO DE PREFLIGHT REQUESTS PARA CORS ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!,
      Deno.env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not found");

    const { data: profile } = await supabaseClient.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    if (!profile) throw new Error("Profile not found");
    
    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.email });
      stripeCustomerId = customer.id;
      await supabaseClient.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", user.id);
    }

    const { priceId } = await req.json();
    if (!priceId) throw new Error("Price ID is required");

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: `${Deno.env.get("SITE_URL")}`,
      cancel_url: `${Deno.env.get("SITE_URL")}/pricing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      // Incluimos los headers de CORS en la respuesta exitosa
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      // Incluimos los headers de CORS también en la respuesta de error
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});