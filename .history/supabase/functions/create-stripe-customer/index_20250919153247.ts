// supabase/functions/create-stripe-customer/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16?target=deno";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, email } = await req.json();
    if (!user_id || !email) throw new Error("User ID y email son requeridos.");

    // 1. Inicializa Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
      apiVersion: '2024-06-20',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 2. Crea el cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: user_id },
    });

    // --- ¡AQUÍ ESTÁ LA PARTE CRÍTICA QUE PROBABLEMENTE FALTABA O FALLABA! ---
    // 3. Crea un cliente de Supabase con permisos de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 4. Guarda el ID del cliente de Stripe en la tabla 'profiles' del usuario
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user_id);

    if (updateError) {
      throw new Error(`Error al guardar customer_id en Supabase: ${updateError.message}`);
    }

    console.log(`Cliente de Stripe ${customer.id} creado y guardado para el usuario ${user_id}.`);

    return new Response(JSON.stringify({ customerId: customer.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error en create-stripe-customer:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});