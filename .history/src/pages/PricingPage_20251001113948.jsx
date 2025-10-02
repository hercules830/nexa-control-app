// src/pages/PricingPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./PricingPage.module.css";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

// Lee el price desde .env; si falta, usamos un marcador para avisar.
const BASIC_PRICE_ID = import.meta.env.VITE_PRICE_ID ?? "price_test_XXXX";

function PricingPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  /** Headers para funciones con verify_jwt=true */
  const buildInvokeHeaders = (accessToken) => ({
    Authorization: `Bearer ${accessToken}`,
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    "x-client-info": "supabase-js-web",
  });

  /** Crea (si hace falta) y retorna el stripe_customer_id guardado en profiles */
  const ensureStripeCustomer = async (currentUser, accessToken) => {
    // 1) Revisa si ya existe en tu tabla
    const { data: profile, error: qErr } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (qErr) console.error("[pricing] query profile error:", qErr);
    if (profile?.stripe_customer_id) return profile.stripe_customer_id;

    // 2) Crear en Stripe vía Edge Function (create-stripe-customer)
    const toastId = toast.loading("Creando tu perfil de cliente…");
    const { data, error } = await supabase.functions.invoke(
      "create-stripe-customer",
      {
        headers: buildInvokeHeaders(accessToken),
        // body: { email: currentUser.email } // si tu función lo requiere
      }
    );

    if (error) {
      console.error("[create-stripe-customer invoke error]", error);
      toast.error("No se pudo crear tu perfil de cliente.", { id: toastId });
      throw new Error(error.message || "Edge function failed (create-stripe-customer)");
    }

    const newCustomerId = data?.customerId || data?.stripe_customer_id || data?.id;
    if (!newCustomerId) {
      toast.error("No se obtuvo el ID del cliente de Stripe.", { id: toastId });
      throw new Error("Missing stripe customer id from function");
    }

    toast.success("¡Perfil de cliente listo!", { id: toastId });
    return newCustomerId;
  };

  const handleCheckout = async (priceId) => {
    setLoading(true);
    try {
      // Valida que el PRICE_ID esté configurado
      if (!priceId || priceId === "price_test_XXXX") {
        toast.error("Configura un PRICE_ID válido en .env.local (VITE_PRICE_ID).");
        return;
      }

      const {
        data: sessionRes,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionRes?.session) {
        console.error("[pricing] no session:", sessionError);
        toast.error("Tu sesión no es válida. Inicia sesión nuevamente.");
        navigate("/login");
        return;
      }

      const accessToken = sessionRes.session.access_token;
      const currentUser = sessionRes.session.user;

      if (!accessToken) {
        throw new Error("No se pudo obtener tu token de sesión. Vuelve a iniciar sesión.");
      }

      // Asegura customerId
      const customerId = await ensureStripeCustomer(currentUser, accessToken);
      if (!customerId) throw new Error("No se pudo obtener el ID del cliente de Stripe.");

      // Crear sesión de checkout
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          headers: buildInvokeHeaders(accessToken),
          body: {
            priceId,
            customerId,
            successUrl: `${window.location.origin}/billing/success`,
            cancelUrl: `${window.location.origin}${location.pathname}`,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Redirige a Stripe
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data?.url) {
        // por compatibilidad si la función devuelve "url"
        window.location.href = data.url;
      } else {
        throw new Error("La función no devolvió la URL de checkout.");
      }
    } catch (err) {
      console.error("[pricing] checkout error:", err);
      toast.error(err.message || "Error al iniciar el pago.");
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
