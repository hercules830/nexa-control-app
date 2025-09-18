// RUTA: src/pages/PricingPage.jsx


import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import styles from './PricingPage.module.css';
import toast from 'react-hot-toast';

// Esta página ahora solo se mostrará a usuarios que ya han iniciado sesión.
function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (priceId) => {
    setLoading(true);
    
    try {
      // 1. Obtenemos el usuario actual (sabemos que existe porque App.jsx nos trajo aquí).
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuario no encontrado. Por favor, inicia sesión de nuevo.");
      }

      // 2. Llamamos a la Edge Function con el formato de body correcto.
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          record: {
            user_id: user.id,
            price_id: priceId
          }
        },
      });

      if (error) {
        // Si la función devuelve un error, lo mostramos.
        const errorData = await error.context.json();
        throw new Error(errorData.error || error.message);
      }
      
      // 3. Redirigimos al usuario a la URL de pago que nos devolvió la función.
      window.location.href = data.url;

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
      <p className={styles.subtitle}>Comienza con 7 días de prueba gratis. Sin contratos, cancela cuando quieras.</p>

      <div className={styles.cardsGrid}>
        {/* --- Plan Básico --- */}
        <div className={styles.pricingCard}>
          <h3>Básico</h3>
          <p className={styles.price}>$350 <span>/ MXN al mes</span></p>
          <ul className={styles.features}>
            <li>✓ Hasta 50 Productos</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reporte de Ganancias</li>
          </ul>
          {/* 
            ¡ACCIÓN REQUERIDA!
            Asegúrate de que este ID de precio sea el correcto de tu cuenta de Stripe.
          */}
          <button 
            onClick={() => handleCheckout('price_1S7tPQ25dmLg7iI6wGT6gAaT')} 
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Comenzar Prueba'}
          </button>
        </div>

        {/* --- Puedes añadir más planes aquí si los creas en Stripe --- */}
        <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
          <h3>Pro</h3>
          <p className={styles.price}>$550 <span>/ MXN al mes</span></p>
          <ul className={styles.features}>
            <li>✓ Productos Ilimitados</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reportes Avanzados</li>
            <li>✓ Soporte Prioritario (WhatsApp)</li>
          </ul>
          {/* Si creas este plan, reemplaza 'ID_DE_PRECIO_PRO' con el ID real */}
          <button 
            onClick={() => handleCheckout('ID_DE_PRECIO_PRO')} 
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Comenzar Prueba'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default PricingPage;