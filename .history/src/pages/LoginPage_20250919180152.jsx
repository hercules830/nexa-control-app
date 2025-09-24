import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import styles from './LoginPage.module.css';
import toast from 'react-hot-toast';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(
            "Email o contraseña incorrecta. Si te registraste con Google, usa ese método.",
            { duration: 6000 }
          );
        } else {
          throw error;
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast.success('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
      setIsRegistering(false);
    } catch (error) {
      toast.error(error.message || "Error al registrarse.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      toast.error(error.message || "Error al iniciar sesión con Google.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h2>{isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}</h2>
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Correo Electrónico</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
          </div>
          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? 'Cargando...' : (isRegistering ? 'Registrar' : 'Ingresar')}
          </button>
        </form>
        <div className={styles.separator}>o</div>
        <button onClick={handleGoogleLogin} className={styles.googleButton} disabled={loading}>
          Continuar con Google
        </button>
        <button onClick={() => setIsRegistering(!isRegistering)} className={styles.toggleButton} disabled={loading}>
          {isRegistering ? '¿Ya tienes una cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  );
}

export default LoginPage;