// RUTA: supabase/functions/create-checkout-session/index.ts
// REEMPLAZA ESTE ARCHIVO COMPLETO CON LA NUEVA ESTRATEGIA

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"
import Stripe from "https://esm.sh/stripe@10.12.0"

console.log("Function starting up...")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-08-01',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Creamos un cliente de Supabase genérico (aún no autenticado)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    console.log("Generic Supabase client created.");

    // 2. Extraemos el token del header de la solicitud
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Authorization header is missing!")
    }
    console.log("Authorization header found.");
    const jwt = authHeader.replace('Bearer ', '')

    // 3. Autenticamos el cliente MANUALMENTE usando el token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    if (userError) {
      console.error("Error getting user with token:", userError.message)
      throw userError
    }
    if (!user) {
      throw new Error("User not found for the provided token.")
    }
    console.log(`User successfully authenticated: ${user.id}`);

    // A partir de aquí, el resto del código funciona como antes
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()
    if (profileError) throw profileError
    console.log("Profile found.");

    let stripeCustomerId = profile.stripe_customer_id
    if (!stripeCustomerId) {
      console.log("Creating new Stripe customer...");
      const customer = await stripe.customers.create({ email: user.email })
      stripeCustomerId = customer.id
      await supabaseClient
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id)
    }

    const { priceId } = await req.json()
    if (!priceId) throw new Error("Price ID is required")
    console.log(`Creating checkout session for price: ${priceId}`);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 7 },
      success_url: Deno.env.get('SITE_URL')!,
      cancel_url: `${Deno.env.get('SITE_URL')!}/pricing`,
    })
    console.log("Stripe session created.");

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Error caught in function:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})