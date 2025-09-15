// src/App.jsx

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WelcomeToast from './components/WelcomeToast';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('welcome');
  const [showWelcomeToast, setShowWelcomeToast] = useState(false);

  // useEffect para escuchar el estado de autenticación de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // --- CAMBIO 1: Se elimina la lógica del toast de aquí ---
      // Ahora su única responsabilidad es actualizar el estado del usuario.
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  // --- CAMBIO 2: La dependencia ahora es un array vacío [] ---
  // Esto asegura que el listener se configure solo una vez.
  }, []);

  // Nuevo efecto para OCULTAR el toast después de un tiempo (este se queda igual)
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
  
  // --- CAMBIO 3: Creamos una función explícita para mostrar el toast ---
  const handleLoginSuccess = () => {
    setShowWelcomeToast(true);
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };

  const handleNavigateToWelcome = () => {
    setCurrentView('welcome');
  }

  // Creamos una función para renderizar la vista correcta
  const renderContent = () => {
    if (user) {
      return <DashboardPage key="dashboardPage" />;
    }

    switch (currentView) {
      case 'login':
        // --- CAMBIO 4: Le pasamos la nueva función como prop a LoginPage ---
        return (
          <LoginPage 
            key="loginPage" 
            onNavigateToWelcome={handleNavigateToWelcome} 
            onLoginSuccess={handleLoginSuccess}
          />
        );
      case 'welcome':
      default:
        return <WelcomePage key="welcomePage" onNavigateToLogin={handleNavigateToLogin} />;
    }
  };

  return (
    <>
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