// src/pages/WelcomePage.jsx

import styles from './WelcomePage.module.css';
import { motion } from 'framer-motion';

// --- Definimos nuestras variantes de animación ---

// Variante para el contenedor principal: controla el escalonamiento de sus hijos
const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      // Esta es la magia: le decimos que anime a sus hijos con un pequeño retraso entre cada uno
      staggerChildren: 0.1
    }
  }
};

// Variante para los elementos individuales: un sutil deslizamiento hacia arriba y desvanecimiento
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// Variante específica para la lista para que sus propios hijos (los <li>) se escalonen
const listVariants = {
  visible: {
    transition: {
      staggerChildren: 0.15 // Un ritmo ligeramente diferente para la lista
    }
  }
};


function WelcomePage({ onNavigateToLogin }) {
  return (
    <div className={styles.welcomeContainer}>
      {/* Usamos motion.div y le aplicamos las variantes del contenedor */}
      <motion.div
        className={styles.contentBox}
        variants={containerVariants}
        initial="hidden" // Estado inicial
        animate="visible" // Estado final
      >
        <div className={styles.logoHeader}>
          {/* Cada elemento hijo ahora es un componente 'motion' con sus propias variantes */}
          <motion.h1 variants={itemVariants} className={styles.welcomeTitle}>
            Bienvenido a
          </motion.h1>
          <motion.img
            variants={itemVariants}
            src="/nexa-control/nexa-horizontal.png" 
            alt="Logo de Nexa Control" 
            className={styles.logoImage} 
          />
        </div>
        
        <motion.p variants={itemVariants} className={styles.subtitle}>
          La herramienta definitiva para llevar el control de tu pequeño negocio.
        </motion.p>

        {/* El <ul> también tiene variantes para controlar a sus <li> */}
        <motion.ul variants={listVariants} className={styles.featureList}> 
          {/* Cada <li> tiene la variante 'item' para animarse individualmente */}
          <motion.li variants={itemVariants}>Registro de ventas diarias</motion.li>
          <motion.li variants={itemVariants}>Control de inventario en tiempo real</motion.li>
          <motion.li variants={itemVariants}>Reportes automáticos y alertas</motion.li>
        </motion.ul>

        {/* El botón también tiene su animación de entrada + efectos al interactuar */}
        <motion.button 
          variants={itemVariants}
          className={styles.ctaButton} 
          onClick={onNavigateToLogin}
          whileHover={{ scale: 1.05, transition: { type: 'spring', stiffness: 300 } }} // Efecto al pasar el cursor
          whileTap={{ scale: 0.95 }} // Efecto al hacer clic
        >
          Empezar Ahora
        </motion.button>
      </motion.div>
    </div>
  );
}

export default WelcomePage;