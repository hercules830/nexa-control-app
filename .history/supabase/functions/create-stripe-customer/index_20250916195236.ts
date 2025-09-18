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
    const { record } = await req.json(); // viene de "auth.users"

    // 1. Crear Customer en Stripe
    const customer = await stripe.customers.create({
      email: record.email,
      metadata: { supabase_uid: record.id },
    });

    // 2. Guardar customer_id en profiles
    await supabase.from("profiles").insert({
      id: record.id,
      stripe_customer_id: customer.id,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Error creando customer:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
