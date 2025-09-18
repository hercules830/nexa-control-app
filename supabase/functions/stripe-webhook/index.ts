// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Secretos de Stripe (los configuraste en Supabase → Secrets)
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
if (!webhookSecret) {
  throw new Error("❌ Falta STRIPE_WEBHOOK_SECRET en Supabase Secrets");
}

// Verificación manual de la firma del webhook
async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const sigParts = signature.split(",");
  let t = "";
  let v1 = "";
  for (const part of sigParts) {
    if (part.startsWith("t=")) t = part.replace("t=", "");
    if (part.startsWith("v1=")) v1 = part.replace("v1=", "");
  }
  if (!t || !v1) return false;

  const payload = `${t}.${body}`;
  const payloadBuffer = encoder.encode(payload);
  const signatureBuffer = new Uint8Array(
    v1.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  return await crypto.subtle.verify("HMAC", key, signatureBuffer, payloadBuffer);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("❌ Missing Stripe signature", { status: 400 });
  }

  const body = await req.text();
  const valid = await verifyStripeSignature(body, signature, webhookSecret!);

  if (!valid) {
    console.error("❌ Firma inválida de Stripe");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("✅ Pago completado:", session.id);

        const customerEmail = session.customer_email;
        const priceId = session.subscription
          ? session.subscription.plan.id
          : session.mode === "subscription"
          ? session.display_items?.[0]?.price?.id
          : null;

        if (customerEmail) {
          const { error } = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/rest/v1/profiles`,
            {
              method: "PATCH",
              headers: {
                "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                subscription_status: "active",
                price_id: priceId,
              }),
            }
          );
          if (error) console.error("❌ Error actualizando perfil:", error);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        console.log("✅ Pago de factura exitoso:", event.data.object.id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log("🔄 Suscripción actualizada:", subscription.id);
        // Aquí podrías actualizar el status (active, canceled, past_due, etc.)
        break;
      }

      default:
        console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }
  } catch (err) {
    console.error("❌ Error procesando evento:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
