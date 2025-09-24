// supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Versión estable
import Stripe from "https://esm.sh/stripe@16?target=deno";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    if (!signature || !webhookSecret) throw new Error("Faltan firma o secreto del webhook.");
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Error en la verificación del webhook: ${err.message}`);
    return new Response(err.message, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      
      let profile;
      let attempts = 0;
      const maxAttempts = 5;

      while (!profile && attempts < maxAttempts) {
        attempts++;
        const { data } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        
        if (data) {
          profile = data;
        } else if (attempts < maxAttempts) {
          await sleep(1000);
        }
      }

      if (!profile) {
        throw new Error(`Perfil no encontrado para customer_id: ${customerId} después de ${maxAttempts} intentos.`);
      }

      await supabaseAdmin
        .from('profiles')
        .update({ subscription_status: 'active' })
        .eq('id', profile.id);
    }
  } catch (err) {
    console.error(`Error en la lógica del webhook: ${err.message}`);
    return new Response(err.message, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});