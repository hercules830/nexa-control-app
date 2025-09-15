// src/pages/DashboardPage.jsx
import { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"; // 1. Importar motion
import styles from "./DashboardPage.module.css"; // Importamos los nuevos estilos

function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState("");

  // 1. Para guardar el historial de ventas. Empezamos con un array vacío.
  const [salesHistory, setSalesHistory] = useState([]);

  // 2. Para controlar el producto seleccionado en el menú desplegable.
  const [selectedProductId, setSelectedProductId] = useState("");

  // 3. Para controlar la cantidad que se va a vender.
  const [saleQuantity, setSaleQuantity] = useState(1);

  const handleAddProduct = (event) => {
    event.preventDefault();
    if (
      productName.trim() === "" ||
      isNaN(productQuantity) ||
      Number(productQuantity) <= 0
    ) {
      alert("Por favor, ingresa un nombre y una cantidad válida.");
      return;
    }
    const newProduct = {
      id: Date.now(),
      name: productName,
      quantity: Number(productQuantity),
    };
    setProducts([...products, newProduct]);
    setProductName("");
    setProductQuantity("");
  };

  const handleIncrementQuantity = (productId) => {
    setProducts((currentProducts) =>
      currentProducts.map((p) =>
        p.id === productId ? { ...p, quantity: p.quantity + 1 } : p
      )
    );
  };

  const handleDecrementQuantity = (productId) => {
    setProducts((currentProducts) =>
      currentProducts.map((p) =>
        p.id === productId && p.quantity > 0
          ? { ...p, quantity: p.quantity - 1 }
          : p
      )
    );
  };

  const handleRegisterSale = (event) => {
    event.preventDefault();

    // --- Validación ---
    if (!selectedProductId) {
      alert('Por favor, selecciona un producto.');
      return;
    }

    const quantityToSell = Number(saleQuantity);
    if (isNaN(quantityToSell) || quantityToSell <= 0) {
      alert('Por favor, ingresa una cantidad válida.');
      return;
    }

    const productToSell = products.find(p => p.id === Number(selectedProductId));

    if (productToSell.quantity < quantityToSell) {
      alert(`No hay suficiente stock. Solo quedan ${productToSell.quantity} unidades de ${productToSell.name}.`);
      return;
    }

    // --- Actualización de Estados ---

    // 1. Actualizar el inventario (disminuir la cantidad)
    setProducts(currentProducts =>
      currentProducts.map(p =>
        p.id === Number(selectedProductId)
          ? { ...p, quantity: p.quantity - quantityToSell }
          : p
      )
    );

    // 2. Crear el registro de la venta y añadirlo al historial
    const newSale = {
      id: Date.now(),
      productId: productToSell.id,
      productName: productToSell.name,
      quantity: quantityToSell,
      date: new Date().toLocaleString('es-MX'), // Guarda la fecha y hora en formato local
    };
    setSalesHistory([newSale, ...salesHistory]); // Añadimos la nueva venta AL PRINCIPIO del array

    // --- Limpieza del formulario ---
    setSelectedProductId('');
    setSaleQuantity(1);
  };

  return (
    <motion.div
      className={styles.dashboardContainer}
      initial={{ opacity: 0, x: 50 }} // Estado inicial: invisible y a la derecha
      animate={{ opacity: 1, x: 0 }} // Estado final (al entrar): visible y en su posición
      exit={{ opacity: 0, x: 50 }} // Estado de salida (si tuviéramos un logout)
      transition={{ duration: 0.5 }} // Duración de la animación
    >
      <h1 className={styles.title}>Gestión de Negocio</h1>

      {/* --- SECCIÓN DE REGISTRO DE PRODUCTO --- */}

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
          <button type="submit" className={styles.button}>
            Agregar
          </button>
        </form>
      </section>

      {/* --- SECCIÓN DE REGISTRO DE VENTA --- */}
      <section className={styles.card}>
        <h2>Registrar Venta</h2>
        <form onSubmit={handleRegisterSale} className={styles.salesFormGrid}>
          {/* Menú desplegable para seleccionar el producto */}
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className={styles.input}
          >
            <option value="" disabled>
              -- Selecciona un producto --
            </option>
            {/* Llenamos el menú con los productos del inventario */}
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          {/* Input para la cantidad a vender */}
          <input
            type="number"
            placeholder="Cantidad"
            className={styles.input}
            value={saleQuantity}
            onChange={(e) => setSaleQuantity(e.target.value)}
            min="1" // No permitir vender 0 o menos
          />

          <button type="submit" className={styles.button}>
            Vender
          </button>
        </form>
      </section>

      {/* --- SECCIÓN DE INVENTARIO --- */}
      <section className={styles.card}>
        <h2>Inventario</h2>
        <ul className={styles.productList}>
          {products.length === 0 ? (
            <p>No hay productos en el inventario.</p>
          ) : (
            products.map((product) => (
              <li key={product.id} className={styles.productItem}>
                <div className={styles.productName}>{product.name}</div>
                <div className={styles.actionButtons}>
                  <button onClick={() => handleDecrementQuantity(product.id)}>
                    -
                  </button>
                  <span className={styles.quantityText}>
                    {product.quantity}
                  </span>
                  <button onClick={() => handleIncrementQuantity(product.id)}>
                    +
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </motion.div>
  );
}

export default DashboardPage;
