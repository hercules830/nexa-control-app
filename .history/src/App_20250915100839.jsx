// REEMPLAZA TU ARCHIVO App.jsx CON ESTE CÓDIGO

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient'; 

import WelcomePage from './pages/WelcomePage';
import PricingPage from './pages/PricingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { Toaster, toast } from 'react-hot-toast'; // Importamos toast directamente

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome');
  
  // Eliminamos el estado 'showWelcomeToast', ya no es necesario.
  // El toast se disparará directamente desde el listener.

  useEffect(() => {
    // Primero, obtenemos la sesión activa al cargar la app.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session ? session.user : null);
      setLoading(false);
    });

    // Nos suscribimos a los cambios de autenticación.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // --- CAMBIO CLAVE AQUÍ ---
        // Solo mostramos el toast si el evento es SIGNED_IN.
        // Este evento solo ocurre en un inicio de sesión, no al recargar.
        if (event === 'SIGNED_IN') {
          toast.success(`¡Bienvenido, ${session.user.email}!`);
        }
        
        setUser(session ? session.user : null);
      }
    );

    // Limpieza de la suscripción.
    return () => {
      subscription?.unsubscribe();
    };
  }, []); // El array de dependencias vacío es correcto.

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  const handleNavigateToPricing = () => setCurrentView('pricing');
  const handleNavigateToLogin = () => setCurrentView('login');
  const handleNavigateToWelcome = () => setCurrentView('welcome');
  
  const renderContent = () => {
    if (user) {
      // Pasamos el prop 'user' a DashboardPage
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
      <Toaster position="top-right" toastOptions={{ style: { background: '#333', color: '#fff' } }}/>
      {/* Ya no necesitamos el componente WelcomeToast, react-hot-toast se encarga */}
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </>
  );
}

export default App;