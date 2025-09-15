// src/pages/LoginPage.jsx

// 1. Importamos el Hook 'useState' desde la librería de React.
import { useState } from 'react';

function LoginPage() {
  // 2. Creamos dos "piezas de estado" para guardar el email y la contraseña.
  // La sintaxis es: const [nombreDeLaVariable, funcionParaActualizarla] = useState(valorInicial);
  const [email, setEmail] = useState(''); // El valor inicial es un string vacío.
  const [password, setPassword] = useState('');

  // 5. Creamos una función para manejar el envío del formulario.
  const handleSubmit = (event) => {
    // preventDefault() evita que el navegador recargue la página, que es su comportamiento por defecto.
    event.preventDefault(); 
    
    // Por ahora, solo mostraremos los datos en la consola para verificar que los capturamos.
    console.log('Intento de login con:');
    console.log('Email:', email);
    console.log('Password:', password);
  };

  return (
    <div>
      <h2>Iniciar Sesión</h2>
      {/* 6. Le decimos al formulario que llame a nuestra función handleSubmit cuando se envíe. */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Correo Electrónico</label>
          {/* 3. Conectamos el input al estado. */}
          <input 
            type="email" 
            id="email"
            value={email} // El valor del input siempre será lo que esté en la variable 'email' del estado.
            onChange={(event) => setEmail(event.target.value)} // Cuando el usuario escribe, actualizamos el estado.
          />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          {/* 4. Hacemos lo mismo para el campo de contraseña. */}
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
  )
}

export default LoginPage