// supabase/functions/stripe-webhook/index.ts
// Webhook verificado con STRIPE_WEBHOOK_SECRET (modo TEST o LIVE según uses)
// Compatible con Deno usando npm:stripe

import Stripe from "npm:stripe@16.6.0";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Helper para respuestas JSON
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!STRIPE_API_KEY) return json(500, { error: "Missing STRIPE_API_KEY" });
    if (!STRIPE_WEBHOOK_SECRET) {
      return json(500, { error: "Missing STRIPE_WEBHOOK_SECRET" });
    }

    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: "2024-06-20" });

    // Lee el cuerpo como texto para verificación de firma
    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig ?? "",
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("[stripe-webhook] signature error:", err);
      return json(400, { error: "Invalid signature" });
    }

    // Manejo mínimo de eventos: añade los que te interesen
    switch (event.type) {
      case "customer.created": {
        const customer = event.data.object as Stripe.Customer;
        console.log("[wh] customer.created", customer.id, customer.email);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("[wh] invoice.paid", invoice.id, invoice.customer);
        // ejemplo de actualización si tienes tabla subscriptions
        // await supabaseAdmin.from("subscriptions").update({ status: "active" }).eq("stripe_customer_id", invoice.customer);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log("[wh] subscription", event.type, sub.id, sub.status);
        // ejemplo de persistencia:
        // await supabaseAdmin.from("subscriptions").upsert({
        //   stripe_subscription_id: sub.id,
        //   stripe_customer_id: String(sub.customer),
        //   status: sub.status,
        //   current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        // });
        break;
      }
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        console.log("[wh] checkout.session.completed", cs.id, cs.customer);
        break;
      }
      default:
        console.log("[wh] unhandled event:", event.type);
    }

    // Responder 200 rápido para que Stripe no reintente
    return json(200, { received: true });
  } catch (err) {
    console.error("[stripe-webhook] error:", err);
    return json(400, { error: String((err as any)?.message || err) });
  }
});
