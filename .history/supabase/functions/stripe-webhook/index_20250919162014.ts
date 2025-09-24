// supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Ya no importamos la librería de Supabase aquí para evitar conflictos, usaremos fetch
// Importamos la librería de Stripe SÓLO para verificar la firma, no para hacer llamadas
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const stripeApiKey = Deno.env.get('STRIPE_API_KEY')!; // Necesitamos esta clave, pero no para inicializar la librería
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Verificamos la firma usando una instancia temporal de Stripe
    const stripe = new Stripe(stripeApiKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });
    const event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;

      let profile;
      let attempts = 0;
      const maxAttempts = 5;

      while (!profile && attempts < maxAttempts) {
        attempts++;
        
        // --- ¡AQUÍ ESTÁ LA MAGIA! USAMOS FETCH DIRECTAMENTE ---
        const response = await fetch(`${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`, {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            profile = data[0];
          }
        }
        
        if (!profile && attempts < maxAttempts) {
          await sleep(1000);
        }
      }

      if (!profile) {
        throw new Error(`Perfil no encontrado para customer_id: ${customerId} después de ${maxAttempts} intentos.`);
      }
      
      // --- TAMBIÉN ACTUALIZAMOS CON FETCH ---
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
        method: 'PATCH',
        headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ subscription_status: 'active' })
      });

      if (!updateResponse.ok) {
        const errorBody = await updateResponse.text();
        throw new Error(`Error al actualizar el perfil: ${errorBody}`);
      }
    }
  } catch (err) {
    console.error(`Error en la lógica del webhook: ${err.message}`);
    return new Response(err.message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});