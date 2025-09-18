// RUTA: supabase/functions/stripe-webhook/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
})
const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  const body = await req.text()

  try {
    const event = await stripe.webhooks.constructEventAsync(body, signature!, signingSecret!)
    const subscription = event.data.object as Stripe.Subscription

    // Obtenemos el user_id de los metadatos que guardamos en el checkout
    const userId = subscription.metadata.user_id

    if (!userId) {
      throw new Error("Webhook Error: user_id not found in subscription metadata.");
    }
    
    // Creamos un cliente con la SERVICE_ROLE_KEY para saltarnos las políticas RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Actualizamos la tabla 'profiles'
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ 
        subscription_status: subscription.status,
        price_id: subscription.items.data[0].price.id,
      })
      .eq('id', userId)

    if (error) {
      throw new Error(`Supabase DB Error: ${error.message}`);
    }
    
    console.log(`Successfully updated profile for user: ${userId}`);
    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (err) {
    console.error("Webhook processing failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})