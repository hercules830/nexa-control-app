// src/pages/PricingPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./PricingPage.module.css";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

// Lee tu PRICE de .env.local; deja un fallback explícito para detectar si falta
const BASIC_PRICE_ID = import.meta.env.VITE_PRICE_ID;

// Log para depuración: verifica qué valor se está cargando al iniciar la app
console.log("[pricing] VITE_PRICE_ID cargado:", BASIC_PRICE_ID);

function PricingPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Headers para Edge Functions protegidas
  const buildInvokeHeaders = (accessToken) => ({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  });

  /**
   * Crea en Stripe (si hace falta) y devuelve stripe_customer_id.
   * Usa una Edge Function dedicada: create-stripe-customer
   */
  const ensureStripeCustomer = async (currentUser, accessToken) => {
    // 1) ¿Ya existe en tu tabla de perfiles?
    const { data: profile, error: qErr } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", currentUser.id)
      .single();

    if (qErr && qErr.code !== 'PGRST116') { // Ignora el error "0 rows"
      console.error("[pricing] query profile error:", qErr);
      throw new Error("No se pudo verificar tu perfil de cliente.");
    }
    if (profile?.stripe_customer_id) return profile.stripe_customer_id;

    // 2) Si no existe, créalo mediante la Edge Function
    const toastId = toast.loading("Creando tu perfil de cliente…");

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-stripe-customer",
        { headers: buildInvokeHeaders(accessToken) }
      );

      if (error) throw error; // Lanza el error para ser atrapado por el catch

      const newCustomerId = data?.customerId;
      if (!newCustomerId) {
        throw new Error("La función no devolvió un ID de cliente de Stripe.");
      }

      toast.success("¡Perfil de cliente listo!", { id: toastId });
      return newCustomerId;

    } catch (err) {
      console.error("[create-stripe-customer invoke error]", err);
      toast.error(err.message || "No se pudo crear tu perfil de cliente.", { id: toastId });
      // Propaga el error para detener el proceso de checkout
      throw new Error("Fallo al crear el cliente de Stripe.");
    }
  };

  const handleCheckout = async (priceId) => {
    // Validación principal: ¿Está configurada la variable de entorno?
    if (!priceId || !priceId.startsWith("price_")) {
      console.error("[pricing] VITE_PRICE_ID no está configurado o es inválido.");
      toast.error("Error de configuración: El ID del plan no es válido. Contacta a soporte.");
      return; // Detiene la ejecución aquí
    }

    setLoading(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
        navigate("/login", { state: { from: location } });
        return;
      }
      
      const { access_token: accessToken, user: currentUser } = session;

      // Asegura tener un stripe_customer_id
      const customerId = await ensureStripeCustomer(currentUser, accessToken);

      // Crea la sesión de checkout en Stripe via Edge Function
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          headers: buildInvokeHeaders(accessToken),
          body: { // El body se convierte a JSON automáticamente
            priceId: priceId,
            customerId: customerId,
            successUrl: `${window.location.origin}/billing/success`,
            cancelUrl: `${window.location.origin}${location.pathname}`,
          },
        }
      );

      if (error) throw new Error(error.message || "La función de checkout falló.");
      if (data?.error) throw new Error(data.error);

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("No se recibió una URL de checkout válida.");
      }
    } catch (err) {
      console.error("[pricing] checkout error:", err);
      toast.error(err.message || "Error al iniciar el proceso de pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.pricingContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className={styles.title}>Elige el Plan Perfecto para tu Negocio</h1>
      <p className={styles.subtitle}>
        Comienza con {import.meta.env.VITE_TRIAL_DAYS ?? 7} días de prueba gratis. Sin contratos, cancela cuando quieras.
      </p>

      <div className={styles.cardsGrid}>
        <div className={styles.pricingCard}>
          <h3>Básico</h3>
          <p className={styles.price}>
            $350 <span>/ MXN al mes</span>
          </p>
          <ul className={styles.features}>
            <li>✓ Hasta 50 Productos</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reporte de Ganancias</li>
          </ul>

          <button
            onClick={() => handleCheckout(BASIC_PRICE_ID)}
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Comenzar Prueba"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default PricingPage;
