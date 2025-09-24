// supabase/functions/create-stripe-customer/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@16?target=deno";
// ¡IMPORTANTE! Añadimos el cliente de Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      throw new Error("user_id y email son requeridos");
    }

    // 1. Inicializa Stripe (esto ya estaba bien)
    const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
      apiVersion: "2024-06-20",
    });

    // 2. Crea el cliente en Stripe (esto ya estaba bien)
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: user_id },
    });

    // --- ESTA ES LA PARTE NUEVA Y CRUCIAL ---
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
      // Si falla al guardar en la DB, lanzamos un error para que no quede inconsistente
      throw new Error(`Error al guardar customer_id en Supabase: ${updateError.message}`);
    }
    // --- FIN DE LA PARTE NUEVA ---

    // 5. Responde al frontend que todo fue exitoso
    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});