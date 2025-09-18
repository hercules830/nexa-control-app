// Ruta del archivo: src/App.jsx

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient'; 

import WelcomePage from './pages/WelcomePage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WelcomeToast from './components/WelcomeToast';
import { Toaster } from 'react-hot-toast';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome');
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  
  // --- NUEVO ESTADO PARA GUARDAR EL ESTADO DE LA SUSCRIPCIÓN ---
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    // Esta función ahora también buscará el perfil del usuario
    const getSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session ? session.user : null);

      if (session) {
        // Si hay sesión, busca en la tabla 'profiles'
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single();
        // Guarda el estado de la suscripción (o null si no tiene)
        setSubscriptionStatus(profile?.subscription_status || null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session ? session.user : null);
        
        if (session) {
          // También busca el perfil cuando el estado de autenticación cambia
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', session.user.id)
            .single();
          setSubscriptionStatus(profile?.subscription_status || null);
        } else {
          // Si el usuario cierra sesión, resetea el estado
          setSubscriptionStatus(null);
        }
        
        if (_event === 'SIGNED_IN' && !sessionStorage.getItem('welcomeToastShown')) {
          setShowWelcomeToast(true);
          sessionStorage.setItem('welcomeToastShown', 'true');
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (showWelcomeToast) {
      const timer = setTimeout(() => {
        setShowWelcomeToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeToast]);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  const handleNavigateToPricing = () => setCurrentView('pricing');
  const handleNavigateToLogin = () => setCurrentView('login');
  const handleNavigateToWelcome = () => setCurrentView('welcome');

  // --- LÓGICA DE RENDERIZADO MEJORADA ---
  const renderContent = () => {
    // CASO 1: El usuario está logueado Y su suscripción está activa.
    // Va directo al dashboard.
    if (user && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')) {
      return <DashboardPage key="dashboardPage" user={user} />;
    }
    
    // CASO 2: El usuario está logueado PERO no tiene una suscripción activa.
    // Se le fuerza a ir a la página de precios para que elija un plan.
    if (user && subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') {
      return <PricingPage key="pricingPage" onNavigateToLogin={handleNavigateToLogin} />;
    }
    
    // CASO 3: No hay un usuario logueado. Se muestra el flujo normal de bienvenida.
    switch (currentView) {
      case 'login':
        return <LoginPage key="loginPage" onNavigateToWelcome={handleNavigateToWelcome} />;
      case 'pricing':
        return <PricingPage key="pricingPage" onNavigateToLogin={handleNavigateToLogin} />;
      case 'welcome':
      default:
        return <WelcomePage key="welcomePage" onNavigateToPricing={handleNavigateToPricing} />;
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
      <AnimatePresence>
        {showWelcomeToast && <WelcomeToast user={user} />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </>
  );
}

export default App;