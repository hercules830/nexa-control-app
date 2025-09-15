import { useState } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
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
  const [currentTicket, setCurrentTicket] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [activeTab, setActiveTab] = useState('ventas'); // Estado para la pestaña activa

  const handleAddProduct = (event) => {
    event.preventDefault();
  
    if (
      productName.trim() === "" ||
      isNaN(productQuantity) || Number(productQuantity) <= 0 ||
      productPrice.trim() === '' || isNaN(productPrice) || Number(productPrice) < 0 ||
      productCost.trim() === '' || isNaN(productCost) || Number(productCost) < 0
    ) {
      alert("Por favor, completa todos los campos con valores válidos.");
      return;
    }
  
    const newProduct = {
      id: Date.now(),
      name: productName,
      quantity: Number(productQuantity),
      price: Number(productPrice),
      cost: Number(productCost),
    };
  
    setProducts([...products, newProduct]);
  
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

  const handleAddItemToTicket = (event) => {
    event.preventDefault();
    if (!selectedProductId) {
      alert("Por favor, selecciona un producto.");
      return;
    }
    const productToAdd = products.find(p => p.id === Number(selectedProductId));
    if (productToAdd.quantity < saleQuantity) {
      alert(`No hay suficiente stock. Solo quedan ${productToAdd.quantity} unidades.`);
      return;
    }

    const newItem = {
      productId: productToAdd.id,
      name: productToAdd.name,
      quantity: saleQuantity,
      price: productToAdd.price,
      cost: productToAdd.cost,
    };

    setCurrentTicket([...currentTicket, newItem]);
    setSelectedProductId('');
    setSaleQuantity(1);
  };

  const handleFinalizeSale = () => {
    if (currentTicket.length === 0) {
      alert("El ticket está vacío.");
      return;
    }
    
    const ticketId = Date.now();

    const newSales = currentTicket.map(item => ({
      id: `${ticketId}-${item.productId}`,
      ticketId: ticketId,
      productId: item.productId,
      productName: item.name,
      quantity: item.quantity,
      price: item.price,
      cost: item.cost,
      profit: (item.price - item.cost) * item.quantity,
      paymentMethod: paymentMethod,
      date: new Date().toLocaleString("es-MX"),
    }));

    setProducts(currentProducts => {
      let updatedProducts = [...currentProducts];
      currentTicket.forEach(ticketItem => {
        updatedProducts = updatedProducts.map(product => 
          product.id === ticketItem.productId 
            ? { ...product, quantity: product.quantity - ticketItem.quantity }
            : product
        );
      });
      return updatedProducts;
    });

    setSalesHistory(prevHistory => [...newSales, ...prevHistory]);

    setCurrentTicket([]);
    setPaymentMethod('efectivo');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
      <div className={styles.header}>
        <h1 className={styles.title}>Gestión de Negocio</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'ventas' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('ventas')}
        >
          Ventas
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'inventario' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('inventario')}
        >
          Inventario
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'reportes' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('reportes')}
        >
          Reportes
        </button>
      </div>
      
      <div className={styles.tabContent}>
        
        {activeTab === 'ventas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <section className={styles.card}>
              <h2>Crear Ticket de Venta</h2>
              <form onSubmit={handleAddItemToTicket} className={styles.salesFormGrid}>
                <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className={styles.input}>
                  <option value="" disabled>-- Selecciona un producto --</option>
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
                  onChange={(e) => setSaleQuantity(Number(e.target.value))} 
                  min="1"
                />
                <button type="submit" className={styles.button}>
                  Agregar al Ticket
                </button>
              </form>
            </section>
            
            <section className={styles.card}>
              <h2>Ticket Actual</h2>
              <ul className={styles.ticketList}>
                {currentTicket.length === 0 ? (
                  <p>Añade productos para empezar un nuevo ticket.</p>
                ) : (
                  currentTicket.map((item, index) => (
                    <li key={index} className={styles.ticketItem}>
                      <span>{item.quantity} x {item.name}</span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))
                )}
              </ul>
              <div className={styles.ticketSummary}>
                <div className={styles.paymentOptions}>
                  <label>
                    <input 
                      type="radio" 
                      value="efectivo" 
                      checked={paymentMethod === 'efectivo'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} 
                    />
                    Efectivo
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      value="tarjeta" 
                      checked={paymentMethod === 'tarjeta'} 
                      onChange={(e) => setPaymentMethod(e.target.value)} 
                    />
                    Tarjeta
                  </label>
                </div>
                <div className={styles.ticketTotal}>
                  <strong>TOTAL:</strong>
                  <span>
                    ${currentTicket.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleFinalizeSale} 
                className={styles.finalizeButton}
                disabled={currentTicket.length === 0}
              >
                Finalizar Venta
              </button>
            </section>
          </motion.div>
        )}

        {activeTab === 'inventario' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
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
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)} 
                  min="0"
                />
                <input 
                  type="number" 
                  placeholder="Costo de Adquisición ($)" 
                  className={styles.input} 
                  value={productCost}
                  onChange={(e) => setProductCost(e.target.value)} 
                  min="0"
                />
                <button type="submit" className={styles.button}>
                  Agregar
                </button>
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
                        <span className={styles.productPrice}>${product.price.toFixed(2)}</span>
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
          </motion.div>
        )}

        {activeTab === 'reportes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
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
        )}
        
      </div>
    </motion.div>
  );
}

export default DashboardPage;