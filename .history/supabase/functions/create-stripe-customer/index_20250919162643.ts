// supabase/functions/create-stripe-customer/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, email } = await req.json();
    console.log(`Función iniciada para user_id: ${user_id}, email: ${email}`);
    if (!user_id || !email) throw new Error("User ID y email son requeridos.");

    const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    console.log("Creando cliente en Stripe...");
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: user_id },
    });
    console.log(`Cliente de Stripe creado: ${customer.id}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log(`Intentando actualizar perfil para user_id: ${user_id} con stripe_customer_id: ${customer.id}`);
    const { data, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user_id)
      .select(); // <-- AÑADIMOS .select() PARA VERIFICAR

    if (updateError) {
      console.error("ERROR de Supabase al actualizar:", updateError);
      throw new Error(`Error al guardar customer_id: ${updateError.message}`);
    }
    
    // Verificamos si la actualización realmente afectó a alguna fila
    if (!data || data.length === 0) {
        console.error("La actualización no afectó a ninguna fila. El perfil del usuario podría no existir.");
        throw new Error("No se encontró el perfil del usuario para actualizar.");
    }

    console.log(`Perfil actualizado exitosamente para user_id: ${user_id}`);

    return new Response(JSON.stringify({ customerId: customer.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error)
  {
    console.error("Error CATASTRÓFICO en create-stripe-customer:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});