// src/pages/DashboardPage.jsx
import { useState } from 'react';
import styles from './DashboardPage.module.css'; // Importamos los nuevos estilos

function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState('');

  const handleAddProduct = (event) => {
    event.preventDefault();
    if (productName.trim() === '' || isNaN(productQuantity) || Number(productQuantity) <= 0) {
      alert('Por favor, ingresa un nombre y una cantidad válida.');
      return;
    }
    const newProduct = { id: Date.now(), name: productName, quantity: Number(productQuantity) };
    setProducts([...products, newProduct]);
    setProductName('');
    setProductQuantity('');
  };

  const handleIncrementQuantity = (productId) => {
    setProducts(currentProducts => currentProducts.map(p => 
      p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
    ));
  };

  const handleDecrementQuantity = (productId) => {
    setProducts(currentProducts => currentProducts.map(p => 
      p.id === productId && p.quantity > 0 ? { ...p, quantity: p.quantity - 1 } : p
    ));
  };

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.title}>Gestión de Negocio</h1>

      <section className={styles.card}>
        <h2>Agregar Nuevo Producto</h2>
        <form onSubmit={handleAddProduct} className={styles.formGrid}>
          <input
            type="text"
            placeholder="Nombre del producto"
            className={styles.input}
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Cantidad"
            className={styles.input}
            value={productQuantity}
            onChange={(e) => setProductQuantity(e.target.value)}
          />
          <button type="submit" className={styles.button}>Agregar</button>
        </form>
      </section>

      <section className={styles.card}>
        <h2>Inventario</h2>
        <ul className={styles.productList}>
          {products.length === 0 ? (
            <p>No hay productos en el inventario.</p>
          ) : (
            products.map((product) => (
              <li key={product.id} className={styles.productItem}>
                <div className={styles.productName}>
                  {product.name}
                </div>
                <div className={styles.actionButtons}>
                  <button onClick={() => handleDecrementQuantity(product.id)}>-</button>
                  <span className={styles.quantityText}>{product.quantity}</span>
                  <button onClick={() => handleIncrementQuantity(product.id)}>+</button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

export default DashboardPage;