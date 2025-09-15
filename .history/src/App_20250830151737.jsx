// src/App.jsx

import { useState } from 'react';
// ¡Asegúrate de que esta importación esté aquí!
import { AnimatePresence } from 'framer-motion'; 
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    // Asegúrate de que tu lógica esté envuelta en AnimatePresence
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        // Y que cada componente tenga su 'key'
        <LoginPage key="loginPage" onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardPage key="dashboardPage" />
      )}
    </AnimatePresence>
  );
}

export default App;