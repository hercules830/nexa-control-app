// supabase/functions/create-stripe-customer/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from '../_shared/supabaseAdmin.ts'

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, userId } = await req.json();
    if (!email || !userId) {
      throw new Error("Email y userId son requeridos.");
    }
    
    // --- LÓGICA MEJORADA DE "BUSCAR O CREAR" ---
    
    // 1. Busca si ya existe un cliente con ese email en Stripe
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    let customer;

    if (existingCustomers.data.length > 0) {
      // 2. Si existe, lo usamos.
      console.log(`Cliente encontrado en Stripe para el email: ${email}`);
      customer = existingCustomers.data[0];
    } else {
      // 3. Si no existe, lo creamos.
      console.log(`Creando nuevo cliente en Stripe para el email: ${email}`);
      customer = await stripe.customers.create({
        email: email,
        // Es buena práctica añadir metadatos para saber de dónde viene el cliente
        metadata: {
          supabase_user_id: userId,
        },
      });
    }

    // 4. Actualizamos el perfil del usuario en Supabase con el ID del cliente de Stripe
    const supabaseAdmin = createSupabaseAdminClient()
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', userId)
    
    if (updateError) {
        throw updateError
    }

    return new Response(JSON.stringify({ customerId: customer.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error en create-stripe-customer:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Usamos 500 para errores internos
    });
  }
});