// src/pages/LoginPage.jsx

function LoginPage() {
    return (
      <div>
        <h2>Iniciar Sesión</h2>
        <form>
          <div>
            <label htmlFor="email">Correo Electrónico</label>
            <input type="email" id="email" />
          </div>
          <div>
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" />
          </div>
          <button type="submit">Ingresar</button>
        </form>
      </div>
    )
  }
  
  export default LoginPage