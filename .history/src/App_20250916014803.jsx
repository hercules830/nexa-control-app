// RUTA: src/App.jsx
// REEMPLAZA ESTE ARCHIVO COMPLETO

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
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  useEffect(() => {
    const getSessionAndProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session ? session.user : null);

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single();
        setSubscriptionStatus(profile?.subscription_status || null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session ? session.user : null);
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', session.user.id)
            .single();
          setSubscriptionStatus(profile?.subscription_status || null);
        } else {
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

  // --- LÓGICA DE RENDERIZADO CORREGIDA PARA EL NUEVO FLUJO ---
  const renderContent = () => {
    // CASO 1: El usuario está logueado Y tiene un plan activo o de prueba.
    // Va directo al dashboard.
    if (user && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')) {
      return <DashboardPage key="dashboardPage" user={user} />;
    }
    
    // CASO 2: El usuario está logueado PERO no tiene un plan.
    // Lo forzamos a ir a la página de precios para que elija uno.
    if (user) {
      return <PricingPage key="pricingPage" onNavigateToLogin={handleNavigateToLogin} />;
    }
    
    // CASO 3: El usuario NO está logueado.
    switch (currentView) {
      case 'login':
        return <LoginPage key="loginPage" onNavigateToWelcome={handleNavigateToWelcome} />;
      case 'pricing':
        // Si un usuario sin sesión intenta ir a precios, lo mandamos a que inicie sesión primero.
        return <LoginPage key="loginPage" onNavigateToWelcome={handleNavigateToWelcome} />;
      case 'welcome':
      default:
        // Ahora le pasamos la función para ir al login, con el nombre de prop correcto.
        return <WelcomePage key="welcomePage" onNavigateToLogin={handleNavigateToLogin} />;
    }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
      <AnimatePresence>
        {showWelcomeToast && <WelcomeToast user={user} />}
      </Anipresence>
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </>
  );
}

export default App;