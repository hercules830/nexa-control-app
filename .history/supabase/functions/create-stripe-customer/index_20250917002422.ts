// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Faltan datos: user_id o email" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_uid: user_id },
    });

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error creando cliente:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
