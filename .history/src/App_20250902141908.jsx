// src/App.jsx

import { useState, useEffect } from 'react'; // 1. Importa useEffect
import { AnimatePresence } from 'framer-motion';
import { auth } from './firebase'; // 2. Importa la configuración de auth
import { onAuthStateChanged } from 'firebase/auth'; // 3. Importa el listener

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  const [user, setUser] = useState(null); // Estado para guardar el objeto de usuario de Firebase
  const [loading, setLoading] = useState(true); // Estado para la carga inicial

  // 4. useEffect para escuchar el estado de autenticación
  useEffect(() => {
    // onAuthStateChanged devuelve una función para "darse de baja" del listener
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Si hay usuario, lo guarda; si no, guarda null
      setLoading(false); // La comprobación ha terminado, ya no estamos cargando
    });

    // 5. Función de limpieza: Se ejecuta cuando el componente se "desmonta"
    //    Esto previene fugas de memoria al cerrar el listener cuando no se necesita.
    return () => {
      unsubscribe();
    };
  }, []); // El array vacío [] significa que este efecto se ejecuta solo UNA VEZ, al montar el componente.

  // 6. Mientras se comprueba el estado, muestra un mensaje de carga
  if (loading) {
    return <div>Cargando aplicación...</div>; // Puedes poner un spinner o un componente más bonito aquí
  }

  return (
    <AnimatePresence mode="wait">
      {/* 7. La lógica ahora depende de si 'user' existe o es null */}
      {/*    Ya no necesitamos la prop onLoginSuccess */}
      {!user ? (
        <LoginPage key="loginPage" />
      ) : (
        <DashboardPage key="dashboardPage" />
      )}
    </AnimatePresence>
  );
}

export default App;