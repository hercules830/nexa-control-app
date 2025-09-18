// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
})

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // 🔹 importante: se necesita Service Role
)

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

    // Guardar en profiles
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user_id)

    if (dbError) {
      console.error("Error guardando en profiles:", dbError)
      return new Response(JSON.stringify({ error: dbError.message }), { status: 500 })
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
