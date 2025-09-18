import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.18.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { record } = await req.json(); // body.record viene de tu frontend
    const { user_id, price_id, origin } = record;

    if (!user_id || !price_id) {
      return new Response(JSON.stringify({ error: "Faltan parámetros" }), { status: 400 });
    }

    // 1. Buscar en profiles si ya tiene stripe_customer_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user_id)
      .single();

    if (profileError) {
      throw new Error("No se pudo obtener el perfil del usuario");
    }

    let customerId = profile?.stripe_customer_id;

    // 2. Si no existe, crear Customer en Stripe
    if (!customerId) {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);

      const customer = await stripe.customers.create({
        email: userData?.user?.email || undefined,
        metadata: { supabase_uid: user_id },
      });

      // Guardar en profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customer.id })
        .eq("id", user_id);

      if (updateError) {
        throw new Error("No se pudo actualizar el perfil con stripe_customer_id");
      }

      customerId = customer.id;
    }

    // 3. Crear la sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/pricing`,
      subscription_data: {
        metadata: { user_id },
      },
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });

  } catch (err) {
    console.error("Error en create-checkout-session:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
