// src/App.jsx

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
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

  const refreshProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setSubscriptionStatus(null);
      return;
    }

    try {
      // Esta consulta ahora SIEMPRE encontrará un perfil gracias al trigger
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", currentUser.id)
        .maybeSingle();
      
      if (error) {
        // Aunque el perfil exista, la consulta puede fallar por otras razones (ej. red)
        throw error;
      }

      // Si el perfil existe pero no tiene status, será null, lo cual es correcto.
      setSubscriptionStatus(profile?.subscription_status ?? null);
    } catch(error) {
      console.error("Error al refrescar el perfil:", error);
      // Este toast ahora solo aparecerá si hay un error de red real, no porque el perfil no exista.
      toast.error("No se pudo cargar la información de tu suscripción.");
      setSubscriptionStatus(null);
    }
  }, []);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        // La primera carga del perfil se hace aquí.
        await refreshProfile(currentUser);
      } catch (error) {
        console.error("Error al cargar sesión inicial:", error);
        toast.error("No se pudo cargar tu sesión. Intenta de nuevo.");
      } finally {
        // Esto se asegura de que la pantalla de carga siempre desaparezca.
        setLoading(false);
      }
    };
    
    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        // También refrescamos el perfil en login/logout
        await refreshProfile(currentUser);
      }
    );

    const handleFocus = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await refreshProfile(currentUser);
      }
    };
    
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshProfile]);

  if (loading) {
    return <div style={{ background: '#111827', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando aplicación...</div>;
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
          element={
            <RequireAuth>
              <RequireSubscription>
                <DashboardPage 
                  user={user} 
                  subscriptionStatus={subscriptionStatus}
                  refreshProfile={() => refreshProfile(user)}
                />
              </RequireSubscription>
            </RequireAuth>
          }
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