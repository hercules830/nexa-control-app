// Importa los módulos necesarios
import Stripe from "npm:stripe@16.6.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define los encabezados CORS para permitir peticiones desde el navegador
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Crea un cliente de Supabase con privilegios de administrador para usar dentro de la función.
// Utiliza variables de entorno para la URL y la clave de servicio.
const supabaseAdmin = createClient(
  Deno.env.get("EDGE_SUPABASE_URL") || "http://host.docker.internal:54321",
  Deno.env.get("EDGE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } }
);

// Función de ayuda para crear respuestas JSON estandarizadas.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Inicia el servidor de la función de Deno.
Deno.serve(async (req: Request) => {
  // Maneja la petición pre-vuelo (preflight) OPTIONS para CORS.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("[LOG 1] ----- Inicio de la función create-stripe-customer -----");

    // Obtiene la clave secreta de Stripe desde las variables de entorno.
    console.log("[LOG 2] Obteniendo la STRIPE_API_KEY...");
    const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY");
    if (!STRIPE_API_KEY) {
      console.error("[ERROR] La variable de entorno STRIPE_API_KEY no está definida.");
      return json(500, { error: "Server: missing STRIPE_API_KEY" });
    }
    const stripe = new Stripe(STRIPE_API_KEY, { apiVersion: "2024-06-20" });
    console.log("[LOG 3] Cliente de Stripe inicializado.");

    // Obtiene el token JWT del encabezado de la petición para identificar al usuario.
    console.log("[LOG 4] Obteniendo el token JWT de la cabecera 'Authorization'...");
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) {
      console.error("[ERROR] No se encontró el token 'Bearer' en la petición.");
      return json(401, { error: "Missing Bearer token" });
    }
    console.log("[LOG 5] Token JWT extraído. Verificando sesión con Supabase...");
    
    // Utiliza el cliente de admin para obtener los datos del usuario a partir del JWT.
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !user) {
      console.error("[ERROR] Error al validar el JWT con Supabase:", userErr?.message || "Usuario no encontrado.");
      return json(401, { error: "Invalid session" });
    }
    console.log(`[LOG 6] Sesión validada. Usuario ID: ${user.id}. Buscando perfil en la base de datos...`);

    // Busca el perfil del usuario en la tabla 'profiles' para ver si ya tiene un ID de cliente de Stripe.
    // MODIFICADO: Se ha quitado "full_name" de la consulta.
    const { data: profile, error: qErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (qErr && qErr.code !== "PGRST116") { // PGRST116 significa "0 filas encontradas", lo cual es normal si no hay perfil.
      console.error("[ERROR] Error de base de datos al buscar el perfil:", qErr.message);
      return json(500, { error: "DB error fetching profile" });
    }
    
    // Si el usuario ya tiene un ID de cliente de Stripe, lo devuelve directamente.
    if (profile?.stripe_customer_id) {
      console.log(`[LOG 7] El usuario ya tiene un Stripe Customer ID: ${profile.stripe_customer_id}. Finalizando.`);
      return json(200, { customerId: profile.stripe_customer_id });
    }
    console.log("[LOG 7] El usuario no tiene un Stripe Customer ID. Creando uno nuevo...");

    // Si no tiene un ID, crea un nuevo cliente en Stripe.
    // MODIFICADO: Se usa "user.user_metadata.full_name" directamente, ya que no se lee de "profiles".
    const customer = await stripe.customers.create({
      email: profile?.email || user.email || undefined,
      name: user.user_metadata?.full_name || undefined,
      metadata: { user_id: user.id },
    });
    console.log(`[LOG 8] Cliente creado en Stripe con ID: ${customer.id}. Actualizando perfil en Supabase...`);

    // Actualiza la tabla 'profiles' del usuario con el nuevo ID de cliente de Stripe.
    const { error: upErr } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user.id);

    if (upErr) {
      console.error("[ERROR] Error al guardar el Stripe Customer ID en la base de datos:", upErr.message);
      return json(500, { error: "DB error saving customer id" });
    }
    console.log("[LOG 9] Perfil actualizado en la base de datos. Enviando respuesta al cliente.");
    
    // Devuelve el nuevo ID de cliente al frontend.
    return json(200, { customerId: customer.id });

  } catch (err) {
    // Captura cualquier otro error inesperado durante la ejecución.
    console.error("[ERROR INESPERADO] La función falló de forma catastrófica:", err);
    return json(400, { error: String((err as any)?.message || err) });
  }
});