// src/App.jsx

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WelcomeToast from './components/WelcomeToast'; // Se importa el componente del toast

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome');
  // Nuevo estado para controlar la visibilidad del toast de bienvenida
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  // useEffect para escuchar el estado de autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Lógica para mostrar el toast:
      // Se activa solo si antes no había un usuario (user era null) y ahora sí hay (currentUser existe).
      // Esto previene que el toast aparezca cada vez que se recarga la página.
      if (!user && currentUser) {
        setShowWelcomeToast(true);
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  // La dependencia [user] asegura que este efecto se re-evalúe si el estado del usuario cambia.
  }, [user]);

  // Nuevo efecto para OCULTAR el toast después de un tiempo
  useEffect(() => {
    // Si el toast se está mostrando...
    if (showWelcomeToast) {
      // ...inicia un temporizador...
      const timer = setTimeout(() => {
        // ...que después de 2000 milisegundos (2 segundos), oculta el toast.
        setShowWelcomeToast(false);
      }, 2000);

      // Limpieza: si el componente se desmonta antes de que pasen los 2s, cancela el timer.
      return () => clearTimeout(timer);
    }
  // Este efecto se ejecuta cada vez que el valor de 'showWelcomeToast' cambia.
  }, [showWelcomeToast]);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  // Función para pasarla como prop a la WelcomePage
  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };

  const handleNavigateToWelcome = () => {
    setCurrentView('welcome');
  }

  // Creamos una función para renderizar la vista correcta
  const renderContent = () => {
    // Si el usuario ESTÁ autenticado, SIEMPRE mostramos el Dashboard.
    if (user) {
      return <DashboardPage key="dashboardPage" />;
    }

    // Si NO está autenticado, decidimos qué mostrar basado en 'currentView'
    switch (currentView) {
      case 'login':
        return <LoginPage key="loginPage" onNavigateToWelcome={handleNavigateToWelcome} />;
      case 'welcome':
      default:
        return <WelcomePage key="welcomePage" onNavigateToLogin={handleNavigateToLogin} />;
    }
  };

  return (
    // Usamos un Fragment (<>) para poder renderizar dos elementos hermanos a la vez
    <>
      {/* Renderizamos el Toast aquí, fuera del flujo principal de páginas */}
      {/* AnimatePresence se asegura de que la animación de salida se ejecute antes de que el elemento desaparezca */}
      <AnimatePresence>
        {showWelcomeToast && <WelcomeToast user={user} />}
      </AnimatePresence>
      
      {/* Este AnimatePresence maneja las transiciones entre Welcome, Login y Dashboard */}
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </>
  );
}

export default App;