// src/pages/LoginPage.jsx
import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
// 1. Importamos auth y las funciones de Firebase que necesitamos
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  // --- CAMBIO: Añadimos las funciones para controlar la persistencia de la sesión ---
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import styles from './LoginPage.module.css';

// Ya no necesitamos recibir la prop onLoginSuccess
function LoginPage({onNavigateToWelcome}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Un estado para mostrar errores al usuario

  // 2. Función para manejar el REGISTRO de un nuevo usuario
  const handleRegister = async (event) => {
    event.preventDefault();
    setError(''); // Limpiamos errores previos
    try {
      // --- CAMBIO: Le decimos a Firebase que la sesión solo dure mientras el navegador esté abierto ---
      await setPersistence(auth, browserSessionPersistence);
      
      // Esta función de Firebase crea el usuario en el backend
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Usuario registrado:', userCredential.user);
      // No necesitamos hacer nada más, el listener en App.jsx se encargará del resto
    } catch (err) {
      // Manejamos errores comunes de Firebase
      if (err.code === 'auth/email-already-in-use') {
        setError('Este correo electrónico ya está en uso.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError('Ocurrió un error al registrar el usuario.');
      }
      console.error(err);
    }
  };

  // 3. Función para manejar el LOGIN de un usuario existente
  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    try {
      // --- CAMBIO: Hacemos lo mismo para el inicio de sesión para asegurar el comportamiento ---
      await setPersistence(auth, browserSessionPersistence);

      // Esta función de Firebase verifica las credenciales
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario autenticado:', userCredential.user);
    } catch (err) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError('Ocurrió un error al iniciar sesión.');
      }
      console.error(err);
    }
  };

  return (
    <motion.div
      className={styles.loginContainer}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.loginCard}>
        <h2 className={styles.title}>Control de Negocio</h2>
        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Correo Electrónico</label>
            <input 
              type="email" id="email" className={styles.input}
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input 
              type="password" id="password" className={styles.input}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* 4. Mostramos el mensaje de error si existe */}
          {error && <p className={styles.errorText}>{error}</p>}

          {/* 5. Añadimos dos botones: uno para login y otro para registro */}
          <div className={styles.buttonGroup}>
            <button type="submit" onClick={handleLogin} className={styles.button}>Ingresar</button>
            <button type="button" onClick={handleRegister} className={`${styles.button} ${styles.buttonSecondary}`}>Registrar</button>
          </div>
        </form>
        <div onClick={onNavigateToWelcome} className={styles.backLink}>
          Volver a la página principal
        </div>
      </div>
    </motion.div>
  );
}

export default LoginPage;