// RUTA: src/App.jsx

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast"; // Importa toast aquí
import { supabase } from "./supabaseClient";

import WelcomePage from "./pages/WelcomePage";
import PricingPage from "./pages/PricingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCancel from "./pages/BillingCancel";
import WelcomeToast from "./components/WelcomeToast";

function AnimatedRoutes({ children }) {
  const location = useLocation();
  return <AnimatePresence mode="wait" key={location.pathname}>{children}</AnimatePresence>;
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  useEffect(() => {
    // --- LÓGICA DE CARGA MEJORADA Y ROBUSTA ---
    const loadSessionAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", currentUser.id)
            .single(); // .single() es más estricto y nos ayuda a encontrar errores

          if (profileError && profileError.code !== 'PGRST116') { // Ignora "no rows found"
            throw profileError;
          }
          setSubscriptionStatus(profile?.subscription_status ?? null);
        } else {
          setSubscriptionStatus(null);
        }
      } catch (error) {
        console.error("Error al cargar sesión:", error);
        toast.error("No se pudo cargar tu sesión. Intenta de nuevo.");
      } finally {
        // ¡CRUCIAL! Esto se ejecuta siempre, haya éxito o error.
        setLoading(false);
      }
    };

    loadSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Actualizamos el usuario cuando cambia el estado de autenticación (login/logout)
        setUser(session?.user ?? null);
        // Forzamos una recarga de datos para asegurar consistencia
        loadSessionAndProfile(); 
      }
    );

    return () => subscription?.unsubscribe();
  }, []); // El array vacío asegura que esto solo se ejecute una vez al montar

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  const isSubscribed = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const RequireAuth = ({ children }) => !user ? <Navigate to="/login" replace /> : children;
  const RequireSubscription = ({ children }) => !isSubscribed ? <Navigate to="/pricing" replace /> : children;

  return (
    <>
      <AnimatePresence>{showWelcomeToast && <WelcomeToast user={user} />}</AnimatePresence>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              isSubscribed ? <Navigate to="/dashboard" replace /> : <Navigate to="/pricing" replace />
            ) : (
              <WelcomePage onNavigateToLogin={() => (window.location.href = "/login")} />
            )
          }
        />
        <Route path="/login" element={<LoginPage onNavigateToWelcome={() => (window.location.href = "/")} />} />
        <Route
          path="/pricing"
          element={<RequireAuth><PricingPage /></RequireAuth>}
        />
        <Route
          path="/dashboard"
          element={<RequireAuth><RequireSubscription><DashboardPage user={user} /></RequireSubscription></RequireAuth>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
      <AnimatedRoutes>
        <Routes>
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/cancel" element={<BillingCancel />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </AnimatedRoutes>
    </Router>
  );
}

export default App;