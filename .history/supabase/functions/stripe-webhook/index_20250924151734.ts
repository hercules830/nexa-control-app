// supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// --- Funciones de Criptografía Manual (Sin cambios) ---
const encoder = new TextEncoder();

const bufferToHex = (buffer: ArrayBuffer): string => {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const verifySignature = async (
  body: string,
  header: string,
  secret: string
): Promise<boolean> => {
  const parts = header.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.split("=")[1];
  const signature = parts.find((part) => part.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !signature) {
    throw new Error("Firma de webhook inválida.");
  }

  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const calculatedSignature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signedPayload)
  );
  
  return bufferToHex(calculatedSignature) === signature;
};
// --- Fin de Funciones de Criptografía ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const isValid = await verifySignature(body, signature!, webhookSecret);
    if (!isValid) {
      throw new Error("Firma del webhook no es válida.");
    }
    
    const event = JSON.parse(body);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (!customerId || !subscriptionId) {
        throw new Error("El evento no contiene customerId o subscriptionId.");
      }
      
      let profile;
      let attempts = 0;
      const maxAttempts = 5;

      while (!profile && attempts < maxAttempts) {
        attempts++;
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`, {
          headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) profile = data[0];
        }
        if (!profile && attempts < maxAttempts) await sleep(1000);
      }

      if (!profile) {
        throw new Error(`Perfil no encontrado para customer_id: ${customerId} después de ${maxAttempts} intentos.`);
      }
      
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: 'PATCH',
        headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        // --- ¡AQUÍ ESTÁ EL CAMBIO ADICIONAL! ---
        // Ahora, además de activar la suscripción, marcamos que la prueba ha sido utilizada.
        body: JSON.stringify({ 
          subscription_status: 'active',
          stripe_subscription_id: subscriptionId,
          has_used_trial: true // <-- AÑADIMOS ESTA LÍNEA
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`Error al actualizar el perfil: ${await updateResponse.text()}`);
      }

      console.log(`Prueba iniciada y marcada para el usuario ${profile.id}.`);
    }
  } catch (err) {
    console.error(`Error en la lógica del webhook: ${err.message}`);
    return new Response(err.message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});