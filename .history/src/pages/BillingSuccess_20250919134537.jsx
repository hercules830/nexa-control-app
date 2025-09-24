// src/pages/BillingSuccess.jsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Estilos simples directamente en el componente para no depender de archivos externos
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

  useEffect(() => {
    // 1. Muestra un mensaje de éxito inmediato.
    toast.success("¡Pago confirmado! Bienvenido a Nexa Control.");

    // 2. Espera 2 segundos para que el usuario vea el mensaje.
    const timer = setTimeout(() => {
      // 3. Redirige al dashboard.
      navigate("/dashboard");
    }, 2000); // 2 segundos

    // 4. Limpia el temporizador si el componente se desmonta antes.
    return () => clearTimeout(timer);
  }, [navigate]); // El efecto se ejecuta solo una vez

  return (
    <div style={containerStyle}>
      <p style={textStyle}>Procesando tu suscripción, serás redirigido en un momento...</p>
    </div>
  );
}