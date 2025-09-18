// Ruta del archivo: supabase/functions/create-checkout-session/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";
import Stripe from "https://esm.sh/stripe@10.12.0";

// Inicializa Stripe con tu clave secreta (que leeremos de forma segura)
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-08-01",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  try {
    // Crea un cliente de Supabase para esta función
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Obtiene el usuario que está haciendo la solicitud
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not found");

    // Busca el perfil del usuario para ver si ya tiene un ID de cliente de Stripe
    const { data: profile } = await supabaseClient.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    if (!profile) throw new Error("Profile not found");
    
    // Si el usuario no tiene un ID de cliente, crea uno nuevo en Stripe
    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.email });
      stripeCustomerId = customer.id;
      // Y guarda el nuevo ID en su perfil de Supabase
      await supabaseClient.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", user.id);
    }

    // Obtiene el ID del precio que el usuario quiere comprar desde el frontend
    const { priceId } = await req.json();
    if (!priceId) throw new Error("Price ID is required");

    // Crea la sesión de pago de Stripe
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // ¡Aquí forzamos el período de prueba de 7 días!
      subscription_data: { trial_period_days: 7 },
      // URLs a las que Stripe redirigirá al usuario
      success_url: `${Deno.env.get("SITE_URL")}`,
      cancel_url: `${Deno.env.get("SITE_URL")}/pricing`,
    });

    // Devuelve la URL de la página de pago al frontend
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});