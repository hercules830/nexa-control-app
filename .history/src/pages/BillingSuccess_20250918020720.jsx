import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function BillingSuccess() {
  const navigate = useNavigate();
  useEffect(() => {
    toast.success("Pago confirmado. ¡Bienvenido!");
    const t = setTimeout(() => navigate("/dashboard"), 1000);
    return () => clearTimeout(t);
  }, [navigate]);
  return <p style={{ textAlign: "center", marginTop: 40 }}>Procesando pago…</p>;
}
