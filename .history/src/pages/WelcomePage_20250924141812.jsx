// RUTA: src/pages/WelcomePage.jsx
// REEMPLAZA ESTE ARCHIVO COMPLETO

// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import styles from './WelcomePage.module.css';

// Cambiamos el nombre de la prop a 'onNavigateToLogin'
function WelcomePage({ onNavigateToLogin }) {
  return (
    <motion.div
      className={styles.welcomeContainer}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.content}>
      <img 
          src="/nexa-control/nexa-horizontal.png" 
          alt="Logo de Nexa Control" 
          className={styles.logoImage} 
        />
        <p className={styles.subtitle}>
          La herramienta definitiva para llevar el control de tu pequeño negocio.
        </p>
        <div className={styles.features}>
          <p>✓ Registro de ventas diarias</p>
          <p>✓ Control de inventario en tiempo real</p>
          <p>✓ Reportes automáticos y alertas</p>
        </div>
        {/* El botón ahora llama a la función onNavigateToLogin */}
        <button onClick={onNavigateToLogin} className={styles.ctaButton}>
          Empezar Ahora
        </button>
      </div>
    </motion.div>
  );
}

export default WelcomePage;