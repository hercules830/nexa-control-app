// src/pages/WelcomePage.jsx (Asegúrate de que se vea así)

import styles from './WelcomePage.module.css';
import { motion } from 'framer-motion';

function WelcomePage({ onNavigateToLogin }) {
  return (
    <div className={styles.welcomeContainer}>
      <motion.div
        className={styles.contentBox} // Clase corregida
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.logoHeader}>
          <h1 className={styles.welcomeTitle}>Bienvenido a</h1>
          <img 
            src="/nexa-control/nexa-horizontal.png" 
            alt="Logo de Nexa Control" 
            className={styles.logoImage} 
          />
        </div>
        
        <p className={styles.subtitle}>
          La herramienta definitiva para llevar el control de tu pequeño negocio.
        </p>

        {/* Usamos <ul> para la lista semántica */}
        <ul className={styles.featureList}> 
          <li>Registro de ventas diarias</li>
          <li>Control de inventario en tiempo real</li>
          <li>Reportes automáticos y alertas</li>
        </ul>

        <button 
          className={styles.ctaButton} 
          onClick={onNavigateToLogin}
        >
          Empezar Ahora
        </button>
      </motion.div>
    </div>
  );
}

export default WelcomePage;