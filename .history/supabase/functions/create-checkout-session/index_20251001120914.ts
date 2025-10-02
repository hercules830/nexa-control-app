// supabase/functions/create-checkout-session/index.ts
import Stripe from "https://esm.sh/stripe@14.23.0?target=deno&no-check";
import { corsHeaders } from "../_shared/cors.ts";

// Inicializa Stripe con la clave secreta desde las variables de entorno de Supabase
const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const TRIAL_DAYS = Number(Deno.env.get("TRIAL_PERIOD_DAYS") ?? "0");

// Función helper para crear respuestas JSON con los headers CORS correctos
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  // Manejo de la solicitud pre-vuelo (preflight) de CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Asegura que el método sea POST
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Parsea el cuerpo (body) de la solicitud de forma segura
  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "No se recibió un JSON válido en el body" }, 400);
  }

  try {
    // Extrae los datos del cuerpo. Usa camelCase consistentemente.
    const { priceId, customerId, successUrl, cancelUrl } = body;

    // Valida que los campos requeridos estén presentes
    if (!priceId || !successUrl || !cancelUrl || !customerId) {
      return json(
        { error: "Faltan campos obligatorios: priceId, customerId, successUrl, cancelUrl" },
        400
      );
    }

    // Crea la sesión de Checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId, // ID del cliente de Stripe, creado previamente
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // Añade período de prueba si está configurado
      subscription_data: TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : undefined,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
    });

    // Devuelve el ID y la URL de la sesión de checkout
    return json({ id: session.id, checkoutUrl: session.url }, 200);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session] Stripe error:", msg);
    return json({ error: `Stripe error: ${msg}` }, 500);
  }
});