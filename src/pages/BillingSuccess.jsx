// src/pages/BillingSuccess.jsx


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

const containerStyle = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  backgroundColor: "#1a1a2e",
  color: "#e0e0e0",
  fontFamily: "sans-serif",
};

const textStyle = { fontSize: "1.5rem" };

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Procesando tu suscripción, por favor espera...");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;

    const checkSubscriptionStatus = async () => {
      attempts++;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && (profile?.subscription_status === "active" || profile?.subscription_status === "trialing")) {
          toast.success("¡Suscripción activada! Bienvenido a Nexa Control.");
          clearInterval(intervalId);
          navigate("/dashboard");
          return;
        }
      }

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        toast.error("Hubo un problema al verificar tu suscripción. Contacta a soporte.");
        setMessage("No pudimos confirmar tu suscripción. Por favor, contacta a soporte.");
      }
    };

    checkSubscriptionStatus();
    const intervalId = setInterval(checkSubscriptionStatus, 2000);
    return () => clearInterval(intervalId);
  }, [navigate]);

  return (
    <div style={containerStyle}>
      <p style={textStyle}>{message}</p>
    </div>
  );
}
