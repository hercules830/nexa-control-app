// supabase/functions/stripe-webhook/index.ts

import Stripe from "npm:stripe@16.6.0";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
  "Access-control-allow-headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Función de ayuda para crear respuestas JSON
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// --- CAMBIO 2: Función de ayuda para actualizar la base de datos ---
// Esta función actualizará el perfil del usuario con el estado de la suscripción.
const updateSubscriptionStatus = async (subscription: Stripe.Subscription) => {
  const customerId = String(subscription.customer);
  const subscriptionId = subscription.id;
  const status = subscription.status;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      subscription_status: status,
      stripe_subscription_id: subscriptionId,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error(`[db-update] Error updating profile for customer ${customerId}:`, error.message);
  } else {
    console.log(`[db-update] Profile updated for customer ${customerId}. Status: ${status}`);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_API_KEY || !STRIPE_WEBHOOK_SECRET) {
      return json(500, { error: "Missing Stripe environment variables" });
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: "2024-06-20", httpClient: Stripe.createFetchHttpClient() });

    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      // --- CAMBIO 1: Usar la versión asíncrona para verificar la firma ---
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        sig ?? "",
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("[stripe-webhook] Signature error:", err.message);
      return json(400, { error: `Invalid signature: ${err.message}` });
    }

    // --- CAMBIO 3: Manejar los eventos y actualizar la base de datos ---
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // La sesión de checkout puede tener directamente el objeto de la suscripción
        if (session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
            await updateSubscriptionStatus(subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(subscription);
        break;
      }
      
      default:
        console.log(`[wh] Unhandled event type: ${event.type}`);
    }

    return json(200, { received: true });

  } catch (err) {
    console.error("[stripe-webhook] General error:", err);
    return json(500, { error: String(err?.message || err) });
  }
});