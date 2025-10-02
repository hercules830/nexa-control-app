// src/pages/PricingPage.jsx
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

const PRICE_ID = import.meta.env.VITE_PRICE_ID;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      if (!PRICE_ID) {
        toast.error("Configura un PRICE_ID válido en .env.local (VITE_PRICE_ID).");
        throw new Error("Missing VITE_PRICE_ID env var.");
      }
      if (!SUPABASE_URL) {
        toast.error("Configura VITE_SUPABASE_URL en .env.local.");
        throw new Error("Missing VITE_SUPABASE_URL env var.");
      }

      // Obtener JWT del usuario si tu función valida auth
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? "";

      console.log("[pricing] VITE_SUPABASE_URL:", SUPABASE_URL);
      console.log("[pricing] VITE_PRICE_ID cargado:", PRICE_ID);

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "x-client-origin": window.location.origin,
        },
        // ¡La función espera "price_id"!
        body: JSON.stringify({ price_id: PRICE_ID }),
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("[pricing] create-checkout-session error:", res.status, text);
        let msg = "Edge Function returned a non-2xx status code";
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) msg = parsed.error;
        } catch {}
        toast.error(msg);
        return;
      }

      let payload = {};
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("Respuesta inválida de la función (no es JSON).");
      }

      if (!payload?.url) {
        console.error("[pricing] Respuesta sin 'url':", payload);
        toast.error("La función no devolvió la URL de Checkout.");
        return;
      }

      window.location.href = payload.url;
    } catch (err) {
      console.error("[pricing] checkout error:", err);
      toast.error(err?.message || "Error en checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-12 bg-[#0f172a] text-white">
      <div className="max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-4xl font-extrabold mb-4"
        >
          Elige el Plan Perfecto para tu Negocio
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-slate-300 mb-10"
        >
          Comienza con 7 días de prueba gratis. Sin contratos, cancela cuando quieras.
        </motion.p>

        <div className="grid grid-cols-1 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="rounded-2xl bg-[#111827] p-8 shadow-xl border border-slate-700"
          >
            <h3 className="text-2xl font-bold mb-4">Básico</h3>
            <div className="flex items-end gap-2 mb-6">
              <span className="text-5xl font-extrabold">$350</span>
              <span className="text-slate-400">/ MXN al mes</span>
            </div>

            <ul className="space-y-3 mb-8 text-slate-300">
              <li>✓ Hasta 50 Productos</li>
              <li>✓ Registro de Ventas</li>
              <li>✓ Control de Inventario</li>
              <li>✓ Reporte de Ganancias</li>
            </ul>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold bg-[#7c4dff] hover:bg-[#6e3dff] disabled:opacity-60 transition"
            >
              {loading ? "Procesando..." : "Comenzar Prueba"}
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
