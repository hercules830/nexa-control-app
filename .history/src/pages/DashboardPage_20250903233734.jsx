// src/pages/DashboardPage.jsx
import { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
// --- CAMBIO: Importamos auth y la función signOut para el cierre de sesión ---
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import styles from "./DashboardPage.module.css";

function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [salesHistory, setSalesHistory] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);

  const handleAddProduct = (event) => {
    event.preventDefault();
  
    // --- MODIFICACIÓN: Añadimos validación para precio y costo ---
    if (
      productName.trim() === "" ||
      isNaN(productQuantity) || Number(productQuantity) <= 0 ||
      productPrice.trim() === '' || isNaN(productPrice) || Number(productPrice) < 0 ||
      productCost.trim() === '' || isNaN(productCost) || Number(productCost) < 0
    ) {
      alert("Por favor, completa todos los campos con valores válidos.");
      return;
    }
  
    // --- MODIFICACIÓN: Añadimos los nuevos campos al objeto del producto ---
    const newProduct = {
      id: Date.now(),
      name: productName,
      quantity: Number(productQuantity),
      price: Number(productPrice), // Guardamos el precio
      cost: Number(productCost),   // Guardamos el costo
    };
  
    setProducts([...products, newProduct]);
  
    // --- MODIFICACIÓN: Limpiamos los nuevos campos del formulario ---
    setProductName("");
    setProductQuantity("");
    setProductPrice("");
    setProductCost("");
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
    if (!selectedProductId) {
      alert("Por favor, selecciona un producto.");
      return;
    }
    const quantityToSell = Number(saleQuantity);
    if (isNaN(quantityToSell) || quantityToSell <= 0) {
      alert("Por favor, ingresa una cantidad válida.");
      return;
    }
    const productToSell = products.find(
      (p) => p.id === Number(selectedProductId)
    );
    if (productToSell.quantity < quantityToSell) {
      alert(
        `No hay suficiente stock. Solo quedan ${productToSell.quantity} unidades de ${productToSell.name}.`
      );
      return;
    }
    setProducts((currentProducts) =>
      currentProducts.map((p) =>
        p.id === Number(selectedProductId)
          ? { ...p, quantity: p.quantity - quantityToSell }
          : p
      )
    );
    const newSale = {
      id: Date.now(),
      productId: productToSell.id,
      productName: productToSell.name,
      quantity: quantityToSell,
      date: new Date().toLocaleString("es-MX"),
    };
    setSalesHistory([newSale, ...salesHistory]);
    setSelectedProductId("");
    setSaleQuantity(1);
  };

  // --- CAMBIO: Nueva función para manejar el cierre de sesión ---
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // El listener en App.jsx se encargará del resto y nos llevará al login
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  return (
    <motion.div
      className={styles.dashboardContainer}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.5 }}
    >
      {/* --- CAMBIO: Añadimos un header para el título y el botón de logout --- */}
      <div className={styles.header}>
        <h1 className={styles.title}>Gestión de Negocio</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>

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

          <input
            type="number"
            placeholder="Precio de Venta ($)"
            className={styles.input}
            value={productPrice} // Conectado a un nuevo estado
            onChange={(e) => setProductPrice(e.target.value)}
            min="0"
          />
          <input
            type="number"
            placeholder="Costo de Adquisición ($)"
            className={styles.input}
            value={productCost} // Conectado a otro nuevo estado
            onChange={(e) => setProductCost(e.target.value)}
            min="0"
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
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className={styles.input}
          >
            <option value="" disabled>
              -- Selecciona un producto --
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Cantidad"
            className={styles.input}
            value={saleQuantity}
            onChange={(e) => setSaleQuantity(e.target.value)}
            min="1"
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
                <span className={styles.productPrice}>${product.price.toFixed(2)}</span>
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

      {/* --- NUEVA SECCIÓN DE HISTORIAL DE VENTAS --- */}
      <section className={styles.card}>
        <h2>Historial de Ventas</h2>
        <ul className={styles.salesList}>
          {salesHistory.length === 0 ? (
            <p>Aún no se han registrado ventas.</p>
          ) : (
            salesHistory.map((sale) => (
              <li key={sale.id} className={styles.salesItem}>
                <span>
                  <strong>{sale.productName}</strong> - {sale.quantity}{" "}
                  unidad(es)
                </span>
                <span className={styles.saleDate}>{sale.date}</span>
              </li>
            ))
          )}
        </ul>
      </section>
    </motion.div>
  );
}

export default DashboardPage;
