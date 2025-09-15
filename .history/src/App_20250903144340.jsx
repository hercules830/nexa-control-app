// src/App.jsx

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import WelcomePage from './pages/WelcomePage'; // 1. Importa la nueva página
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // 2. Nuevo estado para controlar la vista cuando no hay sesión iniciada
  const [currentView, setCurrentView] = useState('welcome'); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>Cargando aplicación...</div>;
  }

  // 3. Función para pasarla como prop a la WelcomePage
  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };


  const handelNavigateToWelcome = () => {
    setCurrentView('welcome');
  }

  // 4. Creamos una función para renderizar la vista correcta
  const renderContent = () => {
    // Si el usuario ESTÁ autenticado, SIEMPRE mostramos el Dashboard.
    if (user) {
      return <DashboardPage key="dashboardPage" />;
    }

    // Si NO está autenticado, decidimos qué mostrar basado en 'currentView'
    switch (currentView) {
      case 'login':
        return <LoginPage key="loginPage" onNavigateToWelcome={handelNavigateToWelcome} />;
      case 'welcome':
      default:
        return <WelcomePage key="welcomePage" onNavigateToLogin={handleNavigateToLogin} />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {renderContent()}
    </AnimatePresence>
  );
}

export default App;