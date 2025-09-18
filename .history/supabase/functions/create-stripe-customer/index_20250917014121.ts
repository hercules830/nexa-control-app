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

    // Guardar el customer.id en profiles
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const response = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user_id}`, {
      method: "PATCH",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ stripe_customer_id: customer.id }),
    })

    if (!response.ok) {
      throw new Error("No se pudo actualizar el perfil en Supabase")
    }

    return new Response(JSON.stringify({ customerId: customer.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Error creando cliente:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
