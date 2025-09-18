import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req: Request) => {
  try {
    const { id, email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400 }
      );
    }

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_uid: id },
    });

    // Guardar en Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase
      .from("profiles")
      .insert([
        { id, email, stripe_customer_id: customer.id }
      ])
      .select();

    return new Response(
      JSON.stringify({ customer }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creando customer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
