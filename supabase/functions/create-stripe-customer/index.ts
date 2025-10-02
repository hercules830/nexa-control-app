import Stripe from "npm:stripe@16.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const supabaseAdmin = createClient(
  Deno.env.get("EDGE_SUPABASE_URL") || "http://host.docker.internal:54321",
  Deno.env.get("EDGE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } }
);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY");
    if (!STRIPE_API_KEY) return json(500, { error: "Server: missing STRIPE_API_KEY" });
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: "2024-06-20" });

    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) return json(401, { error: "Missing Bearer token" });

    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !user) return json(401, { error: "Invalid session" });

    const { data: profile, error: qErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (qErr && qErr.code !== "PGRST116") return json(500, { error: "DB error fetching profile" });
    if (profile?.stripe_customer_id) return json(200, { customerId: profile.stripe_customer_id });

    const customer = await stripe.customers.create({
      email: profile?.email || user.email || undefined,
      name: profile?.full_name || user.user_metadata?.full_name || undefined,
      metadata: { user_id: user.id },
    });

    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user.id);

    if (upErr) return json(500, { error: "DB error saving customer id" });

    return json(200, { customerId: customer.id });
  } catch (err) {
    return json(400, { error: String((err as any)?.message || err) });
  }
});
