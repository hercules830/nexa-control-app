// src/components/PasswordSettingForm.jsx

import { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import styles from './PasswordSettingForm.module.css';

export default function PasswordSettingForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('¡Contraseña actualizada correctamente!');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      toast.error(error.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.passwordFormContainer}>
      <h4>Establecer o Cambiar Contraseña</h4>
      <p>Si te registraste con Google, puedes establecer una contraseña aquí para poder iniciar sesión con tu email directamente.</p>
      <form onSubmit={handleChangePassword}>
        <div className={styles.formGroup}>
          <label htmlFor="password">Nueva Contraseña:</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required disabled={loading} />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
          <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
        </div>
        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? 'Actualizando...' : 'Guardar Contraseña'}
        </button>
      </form>
    </div>
  );
}