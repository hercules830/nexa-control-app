// supabase/functions/create-stripe-customer/index.ts
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseUserClient } from "../_shared/supabaseUserClient.ts"; // <- Importa el cliente de USUARIO
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts";   // <- Importa el cliente de ADMIN que ya tenías

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // 1. **IDENTIFICAR AL USUARIO**
    // Crea un cliente que actúa como el usuario para obtener sus datos de forma segura.
    const userClient = createSupabaseUserClient(req.headers.get("Authorization")!);
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError) throw userError;
    if (!user) return json({ error: "Usuario no autenticado." }, 401);
    if (!user.email) return json({ error: "El usuario no tiene un email registrado." }, 400);

    // 2. **OPERACIONES CON STRIPE**
    // Busca si ya existe un cliente en Stripe con ese email para evitar duplicados.
    const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 });
    let stripeCustomerId = customers[0]?.id;

    // Si no existe, crea uno nuevo en Stripe.
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
    }

    // 3. **ACTUALIZAR LA BASE DE DATOS (CON PRIVILEGIOS)**
    // Crea un cliente de Admin para actualizar la tabla 'profiles' sin problemas de RLS.
    const adminClient = createSupabaseAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    if (updateError) {
      // Si esto falla, es un problema serio del lado del servidor.
      throw new Error(`Error al actualizar perfil con stripe_customer_id: ${updateError.message}`);
    }

    // 4. **DEVOLVER RESPUESTA EXITOSA**
    return json({ customerId: stripeCustomerId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-stripe-customer] Error:", msg);
    return json({ error: `Error interno del servidor: ${msg}` }, 500);
  }
});