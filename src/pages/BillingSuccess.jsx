// src/pages/BillingSuccess.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // <-- Importa supabase
import toast from "react-hot-toast";

// Estilos (sin cambios)
const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#1a1a2e',
  color: '#e0e0e0',
  fontFamily: 'sans-serif',
};

const textStyle = {
  fontSize: '1.5rem',
};

export default function BillingSuccess() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Procesando tu suscripción, por favor espera...");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10; // Intentará durante 20 segundos (10 intentos * 2 segundos)

    const checkSubscriptionStatus = async () => {
      attempts++;
      console.log(`Intento #${attempts} para verificar la suscripción...`);

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error al buscar el perfil:", error);
        }

        // --- ¡ÉXITO! ---
        if (profile && (profile.subscription_status === 'active' || profile.subscription_status === 'trialing')) {
          toast.success("¡Suscripción activada! Bienvenido a Nexa Control.");
          // Limpiamos el intervalo para que no se siga ejecutando
          clearInterval(intervalId);
          // Redirigimos al dashboard
          navigate("/dashboard");
          return;
        }
      }

      // Si llegamos al máximo de intentos y no hay éxito
      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        toast.error("Hubo un problema al verificar tu suscripción. Contacta a soporte.");
        setMessage("No pudimos confirmar tu suscripción. Por favor, contacta a soporte.");
      }
    };

    // Inicia la verificación inmediatamente y luego cada 2 segundos
    checkSubscriptionStatus();
    const intervalId = setInterval(checkSubscriptionStatus, 2000);

    // Limpia el intervalo si el usuario navega a otra página
    return () => clearInterval(intervalId);
  }, [navigate]);

  return (
    <div style={containerStyle}>
      <p style={textStyle}>{message}</p>
    </div>
  );
}