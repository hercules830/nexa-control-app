// create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2022-11-15",
});

serve(async (req) => {
  try {
    const { user_id, email } = await req.json();

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabaseUUID: user_id },
    });

    // Guardar stripe_customer_id en profiles
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("profiles").update({
      stripe_customer_id: customer.id,
    }).eq("id", user_id);

    return new Response(JSON.stringify({ customer }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
