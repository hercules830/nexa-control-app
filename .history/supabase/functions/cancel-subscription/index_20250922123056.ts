// supabase/functions/cancel-subscription/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // --- LÍNEA CLAVE CORREGIDA ---
    // Nos aseguramos de que el token de autorización se extraiga correctamente del encabezado.
    const authHeader = req.headers.get('Authorization')!;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("Usuario no encontrado o no autenticado.");

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.stripe_subscription_id) {
      throw new Error("No se encontró una suscripción activa para cancelar.");
    }

    const subscriptionId = profile.stripe_subscription_id;

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

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