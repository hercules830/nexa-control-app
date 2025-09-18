// REEMPLAZA TU ARCHIVO COMPLETO CON ESTE CÓDIGO
import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import styles from './LoginPage.module.css';
import toast from 'react-hot-toast';

function LoginPage({ onNavigateToWelcome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })
  
    if (error) {
      alert(error.message)
      return
    }
  
    if (data.user) {
      // 🔹 Paso nuevo: llamar a la función de Stripe
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token
  
        const res = await fetch(
          "https://vrfwiopapddpkohavocq.functions.supabase.co/create-stripe-customer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              user_id: data.user.id,
              email: data.user.email
            })
          }
        )
  
        const stripeResponse = await res.json()
        console.log("Cliente Stripe creado:", stripeResponse)
  
      } catch (err) {
        console.error("Error al crear cliente en Stripe:", err)
      }
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      // No hacemos nada más, App.jsx se encarga del resto.
    } catch (error) {
      toast.error(error.error_description || error.message);
    }
  };

  // REEMPLAZA ESTA FUNCIÓN COMPLETA
const handleGoogleSignIn = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Esta línea es la magia. Le dice a Supabase a dónde volver.
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  } catch (error) {
    toast.error(error.error_description || error.message);
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

          <div className={styles.buttonGroup}>
            <button type="submit" onClick={handleLogin} className={styles.button}>Ingresar</button>
            <button type="button" onClick={handleRegister} className={`${styles.button} ${styles.buttonSecondary}`}>Registrar</button>
          </div>
        </form>
        <div className={styles.divider}>
          <span>o</span>
        </div>
        <button onClick={handleGoogleSignIn} className={styles.googleButton}>
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>
        <div onClick={onNavigateToWelcome} className={styles.backLink}>
          Volver a la página principal
        </div>
      </div>
    </motion.div>
  );
}

export default LoginPage;