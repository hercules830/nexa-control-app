// src/pages/LoginPage.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import styles from './LoginPage.module.css'; // 1. Importa el Módulo CSS

function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const CORRECT_EMAIL = 'admin@nexa.com';
  const CORRECT_PASSWORD = '1234';

  const handleSubmit = (event) => {
    event.preventDefault();
    if (email === CORRECT_EMAIL && password === CORRECT_PASSWORD) {
      onLoginSuccess();
    } else {
      alert('Correo o contraseña incorrectos.');
    }
  };

  return (
    // 2. Usa los estilos importados como si fueran un objeto
    <motion.div

    className={styles.loginContainer}
      initial={{ opacity: 0, x: -50 }} // Estado inicial: invisible y a la izquierda
      animate={{ opacity: 1, x: 0 }}   // Estado final (al entrar): visible y en su posición
      exit={{ opacity: 0, x: -50 }}      // Estado de salida: invisible y más a la izquierda
      transition={{ duration: 0.5 }}   // Duración de la animación
    >

      <div className={styles.loginCard}>
        <h2 className={styles.title}>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Correo Electrónico</label>
            <input 
              type="email" 
              id="email"
              className={styles.input}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input 
              type="password" 
              id="password"
              className={styles.input}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="submit" className={styles.button}>Ingresar</button>
        </form>
      </div>
    </motion.div>
  );
}

export default LoginPage;