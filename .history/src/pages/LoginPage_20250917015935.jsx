// src/pages/LoginPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./LoginPage.module.css";
import toast from "react-hot-toast";

function LoginPage({ onNavigateToWelcome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ---------- REGISTRO ----------
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`, // 🔹 respeta tu entorno (dev/prod)
        },
      });
      if (error) throw error;

      toast.success("Revisa tu correo para confirmar tu cuenta.");

      // Crea cliente en Stripe al registrarse
      if (data.user) {
        const { data: invokeData, error: invokeError } =
          await supabase.functions.invoke("create-stripe-customer", {
            body: { user_id: data.user.id, email: data.user.email },
          });

        if (invokeError) {
          console.error("Error Stripe:", invokeError);
          toast.error("No se pudo crear cliente en Stripe (se reintentará en planes).");
          return;
        }

        if (invokeData?.customerId) {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: invokeData.customerId })
            .eq("id", data.user.id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error al registrar.");
    }
  };

  // ---------- LOGIN ----------
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // El enrutador se encarga de mandar al dashboard
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ---------- LOGIN CON GOOGLE ----------
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
