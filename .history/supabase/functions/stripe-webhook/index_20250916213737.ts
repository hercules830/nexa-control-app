// RUTA: supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  try {
    // Validación manual de la firma usando crypto.subtle
    if (!STRIPE_WEBHOOK_SECRET || !signature) {
      return new Response("Missing secret or signature", { status: 400 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!signature.includes(expectedSignature)) {
      return new Response("Invalid signature", { status: 400 });
    }

    // Parsear el evento recibido
    const event = JSON.parse(body);

    switch (event.type) {
      case "checkout.session.completed":
        console.log("✅ Pago completado:", event.data.object.id);
        break;
      case "invoice.payment_succeeded":
        console.log("💰 Suscripción pagada:", event.data.object.customer);
        break;
      case "customer.subscription.updated":
        console.log("🔄 Subscripción actualizada:", event.data.object.status);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response("Webhook handled", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }
});
