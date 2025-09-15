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

  useEffect(() => {
    // Primero, obtenemos la sesión activa al cargar la app para evitar parpadeos
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? session.user : null);
      setLoading(false);
    });

    // Luego, nos suscribimos a cualquier cambio futuro en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session ? session.user : null;
        
        // La lógica del toast se centraliza aquí.
        // Se activa si antes no había usuario y ahora sí.
        if (!user && currentUser) {
          setShowWelcomeToast(true);
        }
        
        setUser(currentUser);
      }
    );

    // La función de limpieza se encarga de cancelar la suscripción
    return () => {
      subscription?.unsubscribe();
    };
  }, [user]);

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

  const handleNavigateToPricing = () => {
    setCurrentView('pricing');
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };
  
  const handleNavigateToWelcome = () => {
    setCurrentView('welcome');
  }

  const renderContent = () => {
    if (user) {
      return <DashboardPage key="dashboardPage" user={user} />;
    }
    switch (currentView) {
      case 'login':
        // Ya no pasamos la prop onLoginSuccess
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