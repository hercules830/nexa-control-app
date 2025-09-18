// RUTA: src/pages/PricingPage.jsx

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import styles from './PricingPage.module.css';
import toast from 'react-hot-toast';

// Esta página ahora solo se mostrará a usuarios que ya han iniciado sesión.
function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Obtenemos el usuario al cargar la página
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  const handleCheckout = async (priceId) => {
    setLoading(true);

    try {
      if (!user) {
        throw new Error("Usuario no encontrado. Por favor, inicia sesión de nuevo.");
      }

      // 1. Obtenemos el customerId desde la tabla profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw new Error("No se pudo obtener el perfil del usuario.");
      }

      if (!profile?.stripe_customer_id) {
        throw new Error("No se encontró un cliente en Stripe para este usuario.");
      }

      // 2. Llamamos a la Edge Function con el body correcto
      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            priceId,                      // ID del plan en Stripe
            userId: user.id,              // UUID del usuario en Supabase
            customerId: profile.stripe_customer_id, // Cliente en Stripe
            origin: window.location.origin,        // URL de origen (para success/cancel)
          },
        }
      );

      if (error) {
        console.error("Error desde función:", error);
        throw new Error(error.message || "Error al iniciar el checkout.");
      }

      // 3. Redirigimos al usuario a la URL de Stripe
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de Stripe.");
      }
    } catch (error) {
      toast.error(error.message || "No se pudo iniciar el proceso de pago.");
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
