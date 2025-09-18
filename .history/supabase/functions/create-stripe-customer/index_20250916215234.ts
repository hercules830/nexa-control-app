import Stripe from "stripe";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  try {
    const { record } = await req.json();

    console.log("Nuevo usuario registrado:", record.email);

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email: record.email,
      metadata: { user_id: record.id },
    });

    // Guardar el customer.id en la tabla profiles
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", record.id);

    if (error) throw error;

    return new Response("Cliente creado en Stripe y guardado en Supabase", {
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response("Error creando cliente", { status: 400 });
  }
});
