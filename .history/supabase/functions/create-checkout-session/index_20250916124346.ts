import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(record.user_id)

    const { data: customerData } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', record.user_id).single()

    let customer = customerData!.stripe_customer_id
    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        email: user!.email,
        metadata: { user_id: record.user_id }
      })
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: stripeCustomer.id }).eq('id', record.user_id)
      customer = stripeCustomer.id
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price: record.price_id,
          quantity: 1,
        },
      ],
      customer: customer,
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/dashboard`,
      cancel_url: `${req.headers.get('origin')}/pricing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})