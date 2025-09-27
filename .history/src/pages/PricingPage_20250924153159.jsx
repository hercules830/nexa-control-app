// src/pages/PricingPage.jsx

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./PricingPage.module.css";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";

function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
  }, []);

  const ensureStripeCustomer = async (currentUser) => {
    if (!currentUser) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", currentUser.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Error al cargar perfil: ${profileError.message}`);
    }

    if (profile?.stripe_customer_id) {
      return profile.stripe_customer_id;
    }

    const toastId = toast.loading('Creando tu perfil de cliente...'); // Usamos loading para mejor feedback

    try {
      // --- ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! ---
      // Cambiamos 'user_id' a 'userId' para que coincida con la Edge Function.
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
        "create-stripe-customer",
        { body: { userId: currentUser.id, email: currentUser.email } } // <-- ¡CORREGIDO!
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }
      
      toast.success('Perfil de cliente creado con éxito.', { id: toastId });
      return invokeData.customerId;

    } catch (err) {
      // Modificamos el toast existente para mostrar el error
      toast.error(`No se pudo crear el cliente en Stripe: ${err.message}`, { id: toastId });
      // Devolvemos null para detener el proceso de checkout
      return null;
    }
  };
  
  const handleCheckout = async (priceId) => {
    setLoading(true);
    try {
      if (!user) {
        toast.error("Por favor, inicia sesión para continuar.");
        navigate('/login');
        return;
      }

      const customerId = await ensureStripeCustomer(user);
      if (!customerId) {
        // El error ya se mostró en ensureStripeCustomer, así que aquí solo detenemos.
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          customerId: customerId,
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}${location.pathname}`,
        },
      });

      if (error) throw error;
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      toast.error(err.message || "Error al iniciar el pago.");
    } finally {
      // Nos aseguramos de que el loading se quite solo si no hay redirección
      // (aunque la redirección usualmente lo detiene)
      if (window.location.href.includes('/pricing')) {
        setLoading(false);
      }
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
        Comienza con 7 días de prueba gratis. Sin contratos, cancela cuando quieras.
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
            onClick={() => handleCheckout("price_1S7tPQ25dmLg7iI6wGT6gAaT")} // VERIFICA QUE ESTE ID SEA EL CORRECTO
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