// Ruta del archivo: src/pages/PricingPage.jsx

import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import styles from './PricingPage.module.css';
import toast from 'react-hot-toast';

function PricingPage({ onNavigateToLogin }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (priceId) => {
    setLoading(true);
    
    // 1. Verifica si el usuario ha iniciado sesión.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Por favor, inicia sesión o regístrate para comenzar tu prueba.');
      onNavigateToLogin(); // Si no hay sesión, lo envía a la página de login.
      return; // Detiene la función aquí.
    }

    try {
      // 2. Llama a nuestra Edge Function 'create-checkout-session'
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { priceId: priceId }, // Le enviamos el ID del precio que el usuario seleccionó.
      });

      if (error) throw error;
      
      // 3. Si todo sale bien, la función nos devuelve una URL de pago de Stripe.
      //    Redirigimos al usuario a esa página.
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
            Reemplaza 'TU_ID_DE_PRECIO_AQUÍ' con el ID de precio real de Stripe.
          */}
          <button 
            onClick={() => handleCheckout('TU_ID_DE_PRECIO_AQUÍ')} 
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Comenzar Prueba'}
          </button>
        </div>

        {/* --- Puedes añadir más planes aquí si los creas en Stripe --- */}
        {/*
        <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
          <h3>Pro</h3>
          <p className={styles.price}>$550 <span>/ MXN al mes</span></p>
          <ul className={styles.features}>
             ...
          </ul>
          <button 
            onClick={() => handleCheckout('OTRO_ID_DE_PRECIO')} 
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? 'Procesando...' : 'Comenzar Prueba'}
          </button>
        </div>
        */}
      </div>
    </motion.div>
  );
}

export default PricingPage;