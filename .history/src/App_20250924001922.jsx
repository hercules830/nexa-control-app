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

  // --- NUEVA FUNCIÓN PARA RECARGAR EL PERFIL ---
  // useCallback evita que la función se recree en cada render, optimizando el rendimiento.
  const refreshProfile = useCallback(async () => {
    // Obtenemos el usuario actual para asegurarnos de que tenemos la sesión más reciente
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Volvemos a consultar la tabla de perfiles para obtener el último estado de la suscripción
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error al refrescar el perfil:", error);
      } else {
        // Actualizamos el estado con el valor más reciente de la base de datos
        setSubscriptionStatus(profile?.subscription_status ?? null);
      }
    } else {
      setSubscriptionStatus(null);
    }
  }, []);

  useEffect(() => {
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
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
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
        setLoading(false);
      }
    };

    loadSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        // Cuando el estado de auth cambia (login/logout), refrescamos el perfil
        // para asegurar que el estado de la suscripción esté sincronizado.
        refreshProfile(); 
      }
    );

    return () => subscription?.unsubscribe();
  }, [refreshProfile]); // Añadimos refreshProfile a las dependencias del efecto

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  // ==================================================================
  // --- ¡AQUÍ ESTÁ LA LÍNEA MODIFICADA! ---
  // Añadimos 'canceled' como un estado válido para tener acceso al dashboard.
  // ==================================================================
  const isSubscribed = subscriptionStatus === "active" || subscriptionStatus === "trialing" || subscriptionStatus === "canceled";

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
                {/* Pasamos el estado de la suscripción y la función para refrescarlo */}
                <DashboardPage 
                  user={user} 
                  subscriptionStatus={subscriptionStatus}
                  refreshProfile={refreshProfile}
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