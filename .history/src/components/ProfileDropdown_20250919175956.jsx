import { useState, useEffect, useRef } from 'react';
import styles from './ProfileDropdown.module.css'; // Crearemos este archivo a continuación

export default function ProfileDropdown({ user, onShowSettings, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cierra el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const getInitials = (email) => {
    if (!email) return "?";
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.dropdownButton}>
        {getInitials(user?.email)}
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.userInfo}>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
          <button
            onClick={() => {
              onShowSettings();
              setIsOpen(false);
            }}
            className={styles.menuItem}
          >
            Configuración de la Cuenta
          </button>
          <button onClick={onLogout} className={`${styles.menuItem} ${styles.logout}`}>
            Cerrar Sesión
          </button>
        </div>
      )}
    </div>
  );
}