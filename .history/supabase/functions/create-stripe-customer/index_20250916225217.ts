// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
})

serve(async (req: Request) => {
  try {
    const { user_id, email } = await req.json()

    if (!user_id || !email) {
      return new Response(JSON.stringify({ error: "Faltan datos: user_id o email" }), { status: 400 })
    }

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_uid: user_id },
    })

    return new Response(JSON.stringify({ customerId: customer.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Error creando cliente:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
