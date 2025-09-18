// REEMPLAZA ESTE ARCHIVO COMPLETO
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./LoginPage.module.css";
import toast from "react-hot-toast";

function LoginPage({ onNavigateToWelcome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();
  
    // 1) Registrar y decirle a Supabase a dónde volver tras verificar
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin, // ← vuelve a http://localhost:5173 en dev
      },
    });
  
    if (error) {
      toast.error(error.message);
      return;
    }
  
    toast.success("Revisa tu correo para confirmar tu cuenta.");
  
    // 2) Si el user existe (supabase devuelve user inmediatamente),
    //    crea el cliente en Stripe.
    if (data.user) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
  
        const res = await fetch(
          "https://vrfwiopapddpkohavocq.functions.supabase.co/create-stripe-customer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_id: data.user.id,
              email: data.user.email,
            }),
          }
        );
  
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || `HTTP ${res.status}`);
        }
  
        const stripeResp = await res.json();
        console.log("Cliente Stripe creado:", stripeResp);
      } catch (err) {
        console.error("Error al crear cliente en Stripe:", err);
        toast.error("No se pudo crear el cliente en Stripe (revisa la consola).");
      }
    }
  };
  
  

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;

      // Si loguea bien, creamos Stripe si aún no existe (best effort)
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (data.user && token) {
        try {
          await fetch(
            "https://vrfwiopapddpkohavocq.functions.supabase.co/create-stripe-customer",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                user_id: data.user.id,
                email: data.user.email,
              }),
            }
          );
        } catch {}
      }
    } catch (error) {
      toast.error(error.error_description || error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // vuelve a la app
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
              onClick={handleRegister}    // <- ya no pasamos el event
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Registrar
            </button>
          </div>
        </form>

        <div className={styles.divider}><span>o</span></div>

        <button onClick={handleGoogleSignIn} className={styles.googleButton}>
          {/* (icono Google omitido por brevedad) */}
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
