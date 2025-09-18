// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.5.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

serve(async (req) => {
  try {
    const { user } = await req.json()

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || user.email,
      metadata: { supabase_uid: user.id },
    })

    // Guardar el customer_id en Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2")

    const supabase = createClient(supabaseUrl, supabaseKey)

    await supabase.from("profiles").update({
      stripe_customer_id: customer.id,
    }).eq("id", user.id)

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    })
  }
})
