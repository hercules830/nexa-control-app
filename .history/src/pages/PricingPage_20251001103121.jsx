// src/pages/PricingPage.jsx
import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const plans = [
  {
    name: "Básico",
    price: 350,
    priceId: "price_1SCmeY25dmLg7iI6N1zTDmK0", // 👈 este lo copiaste de stripe prices list
    features: [
      "Hasta 50 Productos",
      "Registro de Ventas",
      "Control de Inventario",
      "Reporte de Ganancias",
    ],
  },
  // si tienes más planes, los agregas igual
];

export default function PricingPage() {
  const handleCheckout = async (priceId) => {
    try {
      toast.loading("Creando tu perfil de cliente...");

      // Verifica usuario logueado en Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Debes iniciar sesión para continuar.");
        return;
      }

      const res = await fetch("http://127.0.0.1:54321/functions/v1/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId, // 👈 ahora sí está definido
          success_url: "http://localhost:5173/success",
          cancel_url: "http://localhost:5173/cancel",
          customer_email: user.email,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirige a Stripe Checkout
      } else {
        toast.error("No se pudo iniciar el checkout.");
      }
    } catch (err) {
      console.error("[pricing] checkout error:", err);
      toast.error("Error en el checkout.");
    } finally {
      toast.dismiss();
    }
  };

  return (
    <div className="pricing">
      {plans.map((plan) => (
        <div key={plan.priceId} className="plan-card">
          <h3>{plan.name}</h3>
          <p>${plan.price} MXN / mes</p>
          <ul>
            {plan.features.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          <button onClick={() => handleCheckout(plan.priceId)}>
            Comenzar Prueba
          </button>
        </div>
      ))}
    </div>
  );
}
