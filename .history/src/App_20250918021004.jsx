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
import BillingSuccess from "./pages/BillingSuccess";   // <-- crea estos dos archivos (ya te los pasé)
import BillingCancel from "./pages/BillingCancel";
import WelcomeToast from "./components/WelcomeToast";

// Helper para animaciones por ruta (opcional)
function AnimatedRoutes({ children }) {
  const location = useLocation();
  return <AnimatePresence mode="wait" key={location.pathname}>{children}</AnimatePresence>;
}

function App() {
  const [user, setUser] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  // Cargar sesión + status de suscripción
  useEffect(() => {
    const getSessionAndProfile = async () => {
      setLoading(true);
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

  if (loading) return <div>Cargando aplicación...</div>;

  // Guards
  const isSubscribed = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const RequireAuth = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  const RequireSubscription = ({ children }) => {
    if (!isSubscribed) return <Navigate to="/pricing" replace />;
    return children;
  };

  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: "#333", color: "#fff" } }} />
      <AnimatePresence>{showWelcomeToast && <WelcomeToast user={user} />}</AnimatePresence>

      <AnimatedRoutes>
        <Routes>
          {/* Home:
              - Si está logueado y suscrito => Dashboard
              - Si está logueado y NO suscrito => Pricing
              - Si no está logueado => Welcome
          */}
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

          {/* Login siempre accesible */}
          <Route path="/login" element={<LoginPage onNavigateToWelcome={() => (window.location.href = "/")} />} />

          {/* Pricing: requiere sesión, no requiere suscripción */}
          <Route
            path="/pricing"
            element={
              <RequireAuth>
                <PricingPage />
              </RequireAuth>
            }
          />

          {/* Dashboard: requiere sesión + suscripción activa/trial */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <RequireSubscription>
                  <DashboardPage user={user} />
                </RequireSubscription>
              </RequireAuth>
            }
          />

          {/* Rutas de retorno desde Stripe */}
          <Route path="/billing/success" element={<BillingSuccess />} />
          <Route path="/billing/cancel" element={<BillingCancel />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatedRoutes>
    </Router>
  );
}

export default App;
