// src/pages/WelcomePage.jsx

// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import styles from './WelcomePage.module.css';

// Recibimos una función como prop para notificar que queremos ir al login
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
        <h1 className={styles.title}>
          Bienvenido a <span className={styles.brandName}>Nexa Control</span>
        </h1>
        <p className={styles.subtitle}>
          La herramienta definitiva para llevar el control de tu pequeño negocio.
        </p>
        <div className={styles.features}>
          <p>✓ Registro de ventas diarias</p>
          <p>✓ Control de inventario en tiempo real</p>
          <p>✓ Reportes automáticos y alertas</p>
        </div>
        <button onClick={onNavigateToLogin} className={styles.ctaButton}>
          Empezar Ahora
        </button>
      </div>
    </motion.div>
  );
}

export default WelcomePage;