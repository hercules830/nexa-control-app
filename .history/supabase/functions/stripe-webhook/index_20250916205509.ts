// RUTA: supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
})

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET")!

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return new Response("No signature", { status: 400 })
  }

  let event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)

    if (event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted") {

      const subscription = event.data.object as any

      const customerId = subscription.customer as string
      const status = subscription.status
      const priceId = subscription.items.data[0]?.price.id ?? null

      // 🔥 Actualizamos el perfil en Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: status,
          price_id: priceId
        })
        .eq("stripe_customer_id", customerId)

      if (error) {
        console.error("Error updating profile:", error)
      }
    }
  } catch (err) {
    console.error("⚠️ Webhook error:", err)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  return new Response("✅ Event processed", { status: 200 })
})
