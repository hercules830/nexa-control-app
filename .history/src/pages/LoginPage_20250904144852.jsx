// src/pages/LoginPage.jsx
import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import styles from './LoginPage.module.css';

// --- CAMBIO 1: Recibimos la nueva prop 'onLoginSuccess' ---
function LoginPage({ onNavigateToWelcome, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Usuario registrado:', userCredential.user);
      
      // --- CAMBIO 2: Si el registro es exitoso, llamamos a la función para mostrar el toast ---
      onLoginSuccess();

    } catch (err) {
      // (el manejo de errores se queda igual)
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

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario autenticado:', userCredential.user);

      // --- CAMBIO 3: Si el login es exitoso, llamamos a la función para mostrar el toast ---
      onLoginSuccess();

    } catch (err) {
      // (el manejo de errores se queda igual)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError('Ocurrió un error al iniciar sesión.');
      }
      console.error(err);
    }
  };

  // (El JSX se queda exactamente igual)
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

          {error && <p className={styles.errorText}>{error}</p>}

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