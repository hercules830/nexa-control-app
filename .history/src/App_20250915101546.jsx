// REEMPLAZA TU ARCHIVO App.jsx CON ESTE CÓDIGO

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient'; 

import WelcomePage from './pages/WelcomePage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WelcomeToast from './components/WelcomeToast'; // <-- Se usa tu componente
import { Toaster } from 'react-hot-toast';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome');
  const [showWelcomeToast, setShowWelcomeToast] = useState(false); // <-- Estado para controlar tu componente

  useEffect(() => {
    // Carga la sesión inicial para evitar parpadeos.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? session.user : null);
      setLoading(false);
    });

    // Listener para cambios de autenticación.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // --- LÓGICA CORREGIDA Y DEFINITIVA ---
        // 1. El evento debe ser un inicio de sesión real ('SIGNED_IN').
        // 2. No debe existir una bandera en sessionStorage que nos diga que ya lo mostramos.
        if (event === 'SIGNED_IN' && !sessionStorage.getItem('welcomeToastShown')) {
          setShowWelcomeToast(true);
          // Creamos la bandera para que no se muestre de nuevo si se recarga la página.
          sessionStorage.setItem('welcomeToastShown', 'true');
        }
        
        setUser(session ? session.user : null);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // useEffect para ocultar automáticamente el toast de pantalla completa después de unos segundos.
  useEffect(() => {
    if (showWelcomeToast) {
      const timer = setTimeout(() => {
        setShowWelcomeToast(false);
      }, 2000); // Durará 2 segundos en pantalla. Ajústalo si lo necesitas.
      return () => clearTimeout(timer);
    }
  }, [showWelcomeToast]);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  const handleNavigateToPricing = () => setCurrentView('pricing');
  const handleNavigateToLogin = () => setCurrentView('login');
  const handleNavigateToWelcome = () => setCurrentView('welcome');

  const renderContent = () => {
    if (user) {
      return <DashboardPage key="dashboardPage" user={user} />;
    }
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
      {/* El Toaster es para otras notificaciones pequeñas (como "Insumo añadido") */}
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
      
      {/* Aquí se renderiza tu componente de bienvenida con su animación de pantalla completa */}
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