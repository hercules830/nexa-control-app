// supabase/functions/stripe-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;

  try {
    if (!signature || !webhookSecret) {
      throw new Error("Faltan la firma de Stripe o el secreto del webhook.");
    }
    // Verifica que el evento realmente viene de Stripe
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error(err.message);
    return new Response(err.message, { status: 400 });
  }

  // Maneja los eventos de Stripe que nos interesan
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;

        // Busca el perfil del usuario en Supabase usando el customer_id
        const { data: profile, error } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (error || !profile) {
          throw new Error(`Perfil no encontrado para customer_id: ${customerId}`);
        }

        // Actualiza el estado de la suscripción del usuario a 'active'
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'active' })
          .eq('id', profile.id);

        console.log(`Suscripción activada para el usuario: ${profile.id}`);
        break;
      }
      // Puedes añadir más casos para otros eventos, como 'customer.subscription.deleted'
      default:
        // Evento no manejado
    }
  } catch (err) {
    console.error(err.message);
    return new Response(err.message, { status: 500 });
  }

  // Responde a Stripe que todo salió bien
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});