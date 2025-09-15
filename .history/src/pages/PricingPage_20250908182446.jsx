// src/pages/PricingPage.jsx

// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import styles from './PricingPage.module.css';

// Recibe la función para navegar a la página de login
function PricingPage({ onNavigateToLogin }) {
  return (
    <motion.div
      className={styles.pricingContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className={styles.title}>Elige el Plan Perfecto para tu Negocio</h1>
      <p className={styles.subtitle}>Comienza gratis y escala a medida que creces. Sin contratos, cancela cuando quieras.</p>

      <div className={styles.cardsGrid}>
        {/* --- Plan Básico --- */}
        <div className={styles.pricingCard}>
          <h3>Básico</h3>
          <p className={styles.price}>$150 <span>/ MXN al mes</span></p>
          <ul className={styles.features}>
            <li>✓ Hasta 50 Productos</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reporte de Ganancias</li>
          </ul>
          <button onClick={onNavigateToLogin} className={styles.ctaButton}>
            Comenzar Prueba
          </button>
        </div>

        {/* --- Plan Pro (Destacado) --- */}
        <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
          <div className={styles.popularBadge}>Más Popular</div>
          <h3>Pro</h3>
          <p className={styles.price}>$300 <span>/ MXN al mes</span></p>
          <ul className={styles.features}>
            <li>✓ Productos Ilimitados</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reportes Avanzados</li>
            <li>✓ Soporte Prioritario (WhatsApp)</li>
          </ul>
          <button onClick={onNavigateToLogin} className={styles.ctaButton}>
            Comenzar Prueba
          </button>
        </div>

        {/* --- Plan Premium --- */}
        <div className={styles.pricingCard}>
          <h3>Premium</h3>
          <p className={styles.price}>Contacto <span>/ para equipos</span></p>
          <ul className={styles.features}>
            <li>✓ Todo lo del Plan Pro</li>
            <li>✓ Múltiples Usuarios</li>
            <li>✓ Roles y Permisos</li>
            <li>✓ Integraciones Futuras</li>
            <li>✓ Soporte Dedicado</li>
          </ul>
          <button onClick={onNavigateToLogin} className={styles.ctaButton}>
            Contactar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default PricingPage;