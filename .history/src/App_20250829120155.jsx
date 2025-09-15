// src/App.jsx

import { useState } from 'react';
import LoginPage from './pages/LoginPage';

// 1. Crearemos un componente simple para el "Dashboard" o la página principal.
//    Más adelante lo moveremos a su propio archivo.
function DashboardPage() {
  return (
    <div>
      <h1>¡Bienvenido!</h1>
      <p>Aquí irá tu sistema de control de ventas e inventario.</p>
    </div>
  );
}

function App() {
  // 2. Creamos el estado de autenticación aquí, en el componente padre.
  //    Por defecto, el usuario no está logueado (false).
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 3. Creamos una función que cambia el estado a 'logueado'.
  //    Esta es la función que le pasaremos a LoginPage.
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  return (
    <div>
      {/* 4. Aquí ocurre la magia: Renderizado Condicional */}
      {/* Si 'isLoggedIn' es true, muestra el componente DashboardPage. */}
      {/* Si 'isLoggedIn' es false, muestra el componente LoginPage. */}
      {isLoggedIn ? (

        <DashboardPage />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;