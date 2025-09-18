// src/pages/PricingPage.jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./PricingPage.module.css";
import toast from "react-hot-toast";

function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Obtener usuario y perfil al montar
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_customer_id, email")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(profile);

        // Si no hay cliente Stripe, reintenta crearlo
        if (!profile?.stripe_customer_id) {
          const { data: invokeData, error: invokeError } =
            await supabase.functions.invoke("create-stripe-customer", {
              body: { user_id: user.id, email: profile?.email || user.email },
            });

          if (invokeError) {
            console.error("Error Stripe:", invokeError);
            toast.error("No se pudo crear cliente en Stripe (intenta de nuevo).");
          } else if (invokeData?.customerId) {
            await supabase
              .from("profiles")
              .update({ stripe_customer_id: invokeData.customerId })
              .eq("id", user.id);
            setProfile({ ...profile, stripe_customer_id: invokeData.customerId });
            toast.success("Cliente Stripe creado correctamente.");
          }
        }
      }
    };
    loadUser();
  }, []);

  const handleCheckout = async (priceId) => {
    setLoading(true);
    try {
      if (!user) throw new Error("Usuario no encontrado.");
      if (!profile?.stripe_customer_id) throw new Error("Cliente de Stripe no disponible.");

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          userId: user.id,
          customerId: profile.stripe_customer_id,
          origin: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de Stripe.");
      }
    } catch (err) {
      toast.error(err.message || "No se pudo iniciar el checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.pricingContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className={styles.title}>Elige el Plan Perfecto para tu Negocio</h1>
      <p className={styles.subtitle}>
        Comienza con 7 días de prueba gratis. Sin contratos, cancela cuando quieras.
      </p>

      <div className={styles.cardsGrid}>
        {/* --- Plan Básico --- */}
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
            onClick={() => handleCheckout("price_1S7tPQ25dmLg7iI6wGT6gAaT")}
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Comenzar Prueba"}
          </button>
        </div>

        {/* --- Plan Pro --- */}
        <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
          <h3>Pro</h3>
          <p className={styles.price}>
            $550 <span>/ MXN al mes</span>
          </p>
          <ul className={styles.features}>
            <li>✓ Productos Ilimitados</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reportes Avanzados</li>
            <li>✓ Soporte Prioritario (WhatsApp)</li>
          </ul>
          <button
            onClick={() => handleCheckout("ID_DE_PRECIO_PRO")}
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
