// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Crea un cliente de Supabase autenticado con los permisos del usuario que hace la llamada.
    const supabase = createSupabaseClient(req.headers.get("Authorization")!);
    
    // Obtiene los datos del usuario a partir de su token JWT.
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return json({ error: "Usuario no autenticado." }, 401);
    if (!user.email) return json({ error: "El usuario no tiene un email registrado." }, 400);

    // 1. Busca si ya existe un cliente en Stripe con ese email para evitar duplicados.
    const { data: customers } = await stripe.customers.list({ email: user.email, limit: 1 });
    let stripeCustomerId = customers[0]?.id;

    // 2. Si no existe, crea uno nuevo en Stripe.
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }, // Buena práctica: enlaza el ID de Supabase
      });
      stripeCustomerId = customer.id;
    }

    // 3. **Paso CRÍTICO**: Actualiza la tabla 'profiles' del usuario con el ID de cliente de Stripe.
    // Esto evita tener que llamar a Stripe en futuras ocasiones.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);

    if (updateError) {
      console.error("Error al actualizar perfil con stripe_customer_id:", updateError);
      // No lanzamos un error fatal, pero lo registramos. La operación principal tuvo éxito.
    }

    // 4. Devuelve el ID del cliente.
    return json({ customerId: stripeCustomerId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-stripe-customer] Error:", msg);
    return json({ error: `Error interno: ${msg}` }, 500);
  }
});