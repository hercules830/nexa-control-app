// supabase/functions/create-stripe-customer/index.ts
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseUserClient } from "../_shared/supabaseUserClient.ts";
//
// AQUÍ ESTÁ LA CORRECCIÓN IMPORTANTE:
// Apunta al nombre de archivo que tú cambiaste.
//
import { createSupabaseAdminClient } from "../_shared/supabaseAdminClient.ts";

// --- Verificación de Entorno ---
const stripeKey = Deno.env.get("STRIPE_API_KEY");
if (!stripeKey) {
  throw new Error("ERROR CRÍTICO: La variable de entorno STRIPE_API_KEY no está configurada en supabase/.env");
}

const stripe = new Stripe(stripeKey, {
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
    // 1. Identificar al usuario
    const userClient = createSupabaseUserClient(req.headers.get("Authorization")!);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) throw userError;
    if (!user) return json({ error: "Usuario no autenticado." }, 401);
    if (!user.email) return json({ error: "El usuario no tiene un email registrado." }, 400);

    // 2. Operar con Stripe
    const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 });
    let stripeCustomerId = customers[0]?.id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;
    }

    // 3. Actualizar la base de datos con privilegios de Admin
    const adminClient = createSupabaseAdminClient();
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
    if (updateError) throw updateError;

    // 4. Éxito
    return json({ customerId: stripeCustomerId });

  } catch (err) {
    const msg = err instanceof Error ? `[${err.name}] ${err.message}` : String(err);
    console.error(`[create-stripe-customer] Error: ${msg}`);
    return json({ error: `Fallo interno del servidor: ${msg}` }, 500);
  }
});