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
import { Toaster, toast } from 'react-hot-toast'; // Importamos toast

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome');
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('loading');

  useEffect(() => {
    const getSessionAndProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        setUser(session ? session.user : null);

        if (session) {
          // --- BLOQUE DE DEPURACIÓN AÑADIDO ---
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', session.user.id)
            .single();

          // Si hay un error al buscar el perfil, lo mostraremos
          if (profileError && profileError.code !== 'PGRST116') { // PGRST116 significa "cero filas", lo cual es normal para un usuario nuevo
            console.error("Error al buscar el perfil inicial:", profileError);
            toast.error(`Error al buscar perfil: ${profileError.message}`);
            throw profileError;
          }
          setSubscriptionStatus(profile?.subscription_status || 'inactive');
          // --- FIN DEL BLOQUE DE DEPURACIÓN ---
        } else {
          setSubscriptionStatus('inactive');
        }
      } catch (error) {
        console.error("Error en getSessionAndProfile:", error);
        toast.error("Hubo un problema al cargar tu sesión.");
        setSubscriptionStatus('inactive'); // Para evitar bucles
      } finally {
        setLoading(false); // Esta línea AHORA SÍ se ejecutará siempre
      }
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session ? session.user : null);
        
        if (session) {
          setSubscriptionStatus('loading'); 
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', session.user.id)
            .single();
          setSubscriptionStatus(profile?.subscription_status || 'inactive');
        } else {
          setSubscriptionStatus('inactive');
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

  // ... (el resto del archivo App.jsx no cambia)

  useEffect(() => {
    if (showWelcomeToast) {
      const timer = setTimeout(() => {
        setShowWelcomeToast(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeToast]);

  if (loading || (user && subscriptionStatus === 'loading')) {
    return <div>Cargando aplicación...</div>;
  }

  const handleNavigateToLogin = () => setCurrentView('login');
  const handleNavigateToWelcome = () => setCurrentView('welcome');

  const renderContent = () => {
    if (user && (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')) {
      return <DashboardPage key="dashboardPage" user={user} />;
    }
    
    if (user) {
      return <PricingPage key="pricingPage" />;
    }
    
    switch (currentView) {
      case 'login':
        return <LoginPage key="loginPage" onNavigateToWelcome={handleNavigateToWelcome} />;
      case 'pricing':
        return <LoginPage key="loginPage" onNavigateToWelcome={handleNavigateToWelcome} />;
      case 'welcome':
      default:
        return <WelcomePage key="welcomePage" onNavigateToLogin={handleNavigateToLogin} />;
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