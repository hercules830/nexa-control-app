// supabase/functions/create-stripe-customer/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==== C O N F I G ====
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-08-16",
});

// Permite localhost y tu dominio (ajusta si ya tienes prod):
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  Deno.env.get("ALLOWED_ORIGIN") ?? "", // opcional para prod
].filter(Boolean);

// Supabase admin (para actualizar profiles.stripe_customer_id):
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ==== H E L P E R S  C O R S ====
function corsHeaders(origin?: string) {
  const allow = ALLOWED_ORIGINS.includes(origin ?? "")
    ? origin!
    : ALLOWED_ORIGINS[0] ?? "*";

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin") ?? undefined;

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders(origin) }
      );
    }

    // El frontend manda { user_id, email }
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Faltan datos: user_id o email" }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }

    // Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_uid: user_id },
    });

    // Guardar el customer.id en profiles
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user_id);

    if (upErr) {
      console.error("Error actualizando profiles:", upErr);
      // No corto la respuesta, pero te lo dejo registrado
    }

    return new Response(
      JSON.stringify({ customerId: customer.id }),
      { status: 200, headers: corsHeaders(origin) }
    );
  } catch (err: any) {
    console.error("Error creando cliente:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: corsHeaders(origin) }
    );
  }
});
