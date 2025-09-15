// src/pages/LoginPage.jsx

import { useState } from 'react';

// 1. Recibimos el prop 'onLoginSuccess' que nos pasó el componente App.
//    Usamos la desestructuración ({ onLoginSuccess }) para acceder a él directamente.
function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 2. Para este MVP, definiremos el usuario correcto aquí mismo.
  //    Más adelante, esto vendría de una base de datos.
  const CORRECT_EMAIL = 'admin@nexa.com';
  const CORRECT_PASSWORD = '1234';

  const handleSubmit = (event) => {
    event.preventDefault();
    
    // 3. Comparamos los datos del formulario con nuestras credenciales correctas.
    if (email === CORRECT_EMAIL && password === CORRECT_PASSWORD) {
      // 4. Si son correctas, llamamos a la función que nos pasó el padre.
      console.log('Login exitoso!');
      onLoginSuccess();
    } else {
      // 5. Si no, mostramos una alerta al usuario.
      alert('Correo o contraseña incorrectos.');
    }
  };

  return (
    // Usamos las clases que definimos en App.css
    <div className="container"> 
      <div className="card">
        <h2>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          {/* Los inputs y el botón ya toman el estilo automáticamente */}
          <div>
            <label htmlFor="email">Correo Electrónico</label>
            <input 
              type="email" 
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button type="submit">Ingresar</button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;