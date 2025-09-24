// RUTA: src/App.jsx

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { supabase } from "./supabaseClient";

import WelcomePage from "./pages/WelcomePage";
import PricingPage from "./pages/PricingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCancel from "./pages/BillingCancel";
import WelcomeToast from "./components/WelcomeToast";

// Helper para animaciones (sin cambios)
function AnimatedRoutes({ children }) {
  const location = useLocation();
  return <AnimatePresence mode="wait" key={location.pathname}>{children}</AnimatePresence>;
}

// --- NUEVO COMPONENTE PARA MANEJAR RUTAS PROTEGIDAS ---
function MainApp() {
  const [user, setUser] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session ? session.user : null);

      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", session.user.id)
          .maybeSingle();
        setSubscriptionStatus(profile?.subscription_status ?? null);
      } else {
        setSubscriptionStatus(null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_status")
            .eq("id", session.user.id)
            .maybeSingle();
          setSubscriptionStatus(profile?.subscription_status ?? null);
        } else {
          setSubscriptionStatus(null);
        }
        if (event === "SIGNED_IN" && !sessionStorage.getItem("welcomeToastShown")) {
          setShowWelcomeToast(true);
          sessionStorage.setItem("welcomeToastShown", "true");
        }
      }
    );
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!showWelcomeToast) return;
    const t = setTimeout(() => setShowWelcomeToast(false), 2000);
    return () => clearTimeout(t);
  }, [showWelcomeToast]);

  // --- ¡AQUÍ ESTÁ LA MAGIA! ---
  // El "Cargando" ahora solo aplica a las rutas que dependen de la sesión.
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

// --- COMPONENTE PRINCIPAL SIMPLIFICADO ---
function App() {
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
      <AnimatedRoutes>
        <Routes>
          {/* Rutas públicas que no deben ser bloqueadas por el "loading" */}
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/cancel" element={<BillingCancel />} />

          {/* El resto de la aplicación que SÍ necesita el estado de carga */}
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </AnimatedRoutes>
    </Router>
  );
}

export default App;