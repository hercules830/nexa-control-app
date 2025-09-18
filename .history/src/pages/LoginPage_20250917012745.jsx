// src/pages/LoginPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./LoginPage.module.css";
import toast from "react-hot-toast";

function LoginPage({ onNavigateToWelcome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registrar usuario
  const handleRegister = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      toast.success("Revisa tu correo para confirmar tu cuenta.");
    }
  };

  // Login normal
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Google login
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err.message);
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
              type="email"
              id="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input
              type="password"
              id="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className={styles.buttonGroup}>
            <button type="submit" onClick={handleLogin} className={styles.button}>
              Ingresar
            </button>
            <button
              type="button"
              onClick={handleRegister}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Registrar
            </button>
          </div>
        </form>

        <div className={styles.divider}><span>o</span></div>

        <button onClick={handleGoogleSignIn} className={styles.googleButton}>
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
