// supabase/functions/cancel-subscription/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Reutilizamos los CORS

serve(async (req) => {
  // Manejo de CORS preflight (necesario para llamadas desde el navegador)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Inicializa el cliente de Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 2. Crea un cliente de Supabase autenticado como el usuario que hace la llamada
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 3. Obtiene los datos del usuario a partir del token de la solicitud
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuario no autenticado.");

    // 4. Busca en la base de datos el ID de la suscripción de Stripe para ese usuario
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.stripe_subscription_id) {
      throw new Error("No se encontró una suscripción activa para este usuario.");
    }

    const subscriptionId = profile.stripe_subscription_id;

    // 5. Envía la solicitud a Stripe para cancelar la suscripción
    // 'cancel_at_period_end: true' es la forma segura: el usuario mantiene el acceso
    // hasta que termine su ciclo de facturación (o el período de prueba).
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // 6. Actualiza el estado en tu propia base de datos
    // Esto es opcional pero recomendado para que tu UI pueda reaccionar.
    // Stripe enviará un webhook 'customer.subscription.updated' que también puedes usar.
    await supabaseClient
      .from('profiles')
      .update({ subscription_status: 'canceled' })
      .eq('id', user.id);

    return new Response(JSON.stringify({ message: "Suscripción programada para cancelación." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error al cancelar suscripción:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});