// src/pages/PricingPage.jsx
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./PricingPage.module.css";
import toast from "react-hot-toast";

function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [hydrated, setHydrated] = useState(false); // asegura auth listo

  // ---- 1) Hidratar sesión y escuchar cambios de auth ----
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(sessionRes?.session?.user ?? null);
      setHydrated(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    init();
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // ---- 2) Cargar perfil y crear cliente Stripe si falta ----
  const ensureStripeCustomer = useCallback(async (u) => {
    if (!u) return null;

    // cargar perfil actual
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", u.id)
      .maybeSingle();

    if (profErr) {
      console.error("Error cargando profile:", profErr);
      toast.error("No se pudo cargar tu perfil.");
      return null;
    }

    setProfile(prof);

    // si ya existe, regresar
    if (prof?.stripe_customer_id) return prof;

    // crear cliente en Stripe (Edge Function debe manejar CORS/OPTIONS)
    const { data: invokeData, error: invokeError } = await supabase.functions.invoke(
      "create-stripe-customer",
      {
        body: { user_id: u.id, email: prof?.email || u.email },
      }
    );

    if (invokeError) {
      console.error("create-stripe-customer:", invokeError);
      toast.error("No se pudo crear el cliente en Stripe. Intenta de nuevo.");
      return prof ?? null;
    }

    if (invokeData?.customerId) {
      // guarda en DB
      const { error: upErr } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: invokeData.customerId })
        .eq("id", u.id);

      if (upErr) {
        console.error("update stripe_customer_id:", upErr);
        toast.error("No se pudo guardar el cliente de Stripe.");
        return { ...prof, stripe_customer_id: null };
      }

      const updated = { ...(prof || {}), stripe_customer_id: invokeData.customerId };
      setProfile(updated);
      toast.success("Cliente de Stripe creado.");
      return updated;
    }

    return prof ?? null;
  }, []);

  // Cargar/asegurar cliente Stripe cuando hay usuario
  useEffect(() => {
    if (hydrated && user) {
      ensureStripeCustomer(user);
    }
  }, [hydrated, user, ensureStripeCustomer]);

  // ---- 3) Invocar checkout (punto 2 corregido) ----
  const handleCheckout = async (priceId) => {
    try {
      setLoading(true);

      // asegurarnos de que hay usuario y cliente stripe
      const { data: uRes } = await supabase.auth.getUser();
      const currentUser = uRes?.user ?? user;
      if (!currentUser) {
        toast.error("Primero inicia sesión.");
        window.location.href = "/login";
        return;
      }

      const prof = profile?.stripe_customer_id
        ? profile
        : await ensureStripeCustomer(currentUser);

      if (!prof?.stripe_customer_id) {
        throw new Error("Cliente de Stripe no disponible.");
      }

      // Llamada a la Edge Function de checkout con email (y opcional customerId)
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          customerEmail: currentUser.email, // la función usará esto
          customerId: prof.stripe_customer_id, // opcional, por si la función lo aprovecha
          successUrl: `${window.location.origin}/billing/success`,
          cancelUrl: `${window.location.origin}/billing/cancel`,
        },
      });

      if (error) {
        // Este error es el que te salía como "Failed to send a request to the Edge Function"
        // cuando no había CORS o la función no estaba desplegada.
        throw new Error(error.message || "Error al invocar el checkout.");
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de Stripe.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "No se pudo iniciar el checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.pricingContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className={styles.title}>Elige el Plan Perfecto para tu Negocio</h1>
      <p className={styles.subtitle}>
        Comienza con 7 días de prueba gratis. Sin contratos, cancela cuando quieras.
      </p>

      <div className={styles.cardsGrid}>
        {/* --- Plan Básico --- */}
        <div className={styles.pricingCard}>
          <h3>Básico</h3>
          <p className={styles.price}>
            $350 <span>/ MXN al mes</span>
          </p>
          <ul className={styles.features}>
            <li>✓ Hasta 50 Productos</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reporte de Ganancias</li>
          </ul>
          <button
            onClick={() => handleCheckout("price_1S7tPQ25dmLg7iI6wGT6gAaT")}
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Comenzar Prueba"}
          </button>
        </div>

        {/* --- Plan Pro --- */}
        <div className={`${styles.pricingCard} ${styles.featuredCard}`}>
          <h3>Pro</h3>
          <p className={styles.price}>
            $550 <span>/ MXN al mes</span>
          </p>
          <ul className={styles.features}>
            <li>✓ Productos Ilimitados</li>
            <li>✓ Registro de Ventas</li>
            <li>✓ Control de Inventario</li>
            <li>✓ Reportes Avanzados</li>
            <li>✓ Soporte Prioritario (WhatsApp)</li>
          </ul>
          <button
            onClick={() => handleCheckout("ID_DE_PRECIO_PRO")} // <-- pon tu price real
            className={styles.ctaButton}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Comenzar Prueba"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default PricingPage;
