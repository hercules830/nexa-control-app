// src/components/WelcomeToast.jsx

// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import styles from './WelcomeToast.module.css';

// Recibe el objeto 'user' para poder mostrar el correo de bienvenida
function WelcomeToast({ user }) {
  // Extraemos el email del usuario, si no existe, ponemos un texto por defecto.
  const userEmail = user ? user.email : 'Usuario';

  return (
    <motion.div
      className={styles.overlay}
      // Animación de entrada: aparece suavemente
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      // Animación de salida: se hace grande y desaparece (el efecto de zoom)
      exit={{ opacity: 0, scale: 8 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className={styles.toast}>
        <h2>Bienvenido</h2>
        <p>{userEmail}</p>
      </div>
    </motion.div>
  );
}

export default WelcomeToast;