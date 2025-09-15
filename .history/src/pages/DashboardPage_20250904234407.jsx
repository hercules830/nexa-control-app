import { useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import { auth, db } from "../firebase";
import { collection, onSnapshot, addDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { signOut } from "firebase/auth";
import styles from "./DashboardPage.module.css";


function DashboardPage({ user }) {
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
  const [activeTab, setActiveTab] = useState('ventas');

  useEffect(() => {
    if (!user) return;

    // Listener para la colección de productos
    const productsCollectionRef = collection(db, 'users', user.uid, 'products');
    const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    });

    // Listener para la colección de ventas
    const salesCollectionRef = collection(db, 'users', user.uid, 'sales');
    const unsubscribeSales = onSnapshot(salesCollectionRef, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordenamos las ventas por fecha para mostrar las más recientes primero
      salesData.sort((a, b) => b.ticketId - a.ticketId);
      setSalesHistory(salesData);
    });

    // Función de limpieza para detener los listeners cuando el componente se desmonte
    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, [user]);

  const handleAddProduct = async (event) => {
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
  
    try {
      const productsCollectionRef = collection(db, 'users', user.uid, 'products');
      const newProductData = {
        name: productName,
        quantity: Number(productQuantity),
        price: Number(productPrice),
        cost: Number(productCost),
      };
      await addDoc(productsCollectionRef, newProductData);
      console.log("¡Producto añadido a Firestore!");
      setProductName("");
      setProductQuantity("");
      setProductPrice("");
      setProductCost("");
    } catch (error) {
      console.error("Error al añadir el producto:", error);
      alert("Ocurrió un error al guardar el producto.");
    }
  };

  // --- FUNCIÓN RESTAURADA ---
  // Esta función faltaba en tu código. La volvemos a añadir.
  const handleIncrementQuantity = async (productId) => {
    try {
      // 1. Obtenemos el producto actual para saber la cantidad presente.
      const productToUpdate = products.find(p => p.id === productId);
      const currentQuantity = productToUpdate.quantity;
      
      // 2. Creamos la referencia directa al documento que queremos actualizar.
      const productDocRef = doc(db, 'users', user.uid, 'products', productId);

      // 3. Usamos updateDoc para actualizar solo el campo 'quantity'.
      await updateDoc(productDocRef, {
        quantity: currentQuantity + 1
      });

    } catch (error) {
      console.error("Error al incrementar la cantidad:", error);
      alert("No se pudo actualizar el producto.");
    }
  };

  const handleDecrementQuantity = async (productId) => {
    try {
      // 1. Obtenemos el producto actual para validación.
      const productToUpdate = products.find(p => p.id === productId);
      const currentQuantity = productToUpdate.quantity;

      // 2. Validación para no permitir cantidades negativas.
      if (currentQuantity <= 0) {
        console.warn("Se intentó decrementar un producto con stock 0.");
        return; 
      }
      
      // 3. Creamos la referencia al documento.
      const productDocRef = doc(db, 'users', user.uid, 'products', productId);

      // 4. Usamos updateDoc para actualizar el campo 'quantity'.
      await updateDoc(productDocRef, {
        quantity: currentQuantity - 1
      });

    } catch (error) {
      console.error("Error al decrementar la cantidad:", error);
      alert("No se pudo actualizar el producto.");
    }
  };

  const handleAddItemToTicket = (event) => {
    event.preventDefault();
    if (!selectedProductId) {
      alert("Por favor, selecciona un producto.");
      return;
    }
    const productToAdd = products.find(p => p.id === selectedProductId);
    if (!productToAdd) {
      alert("Producto no encontrado.");
      return;
    }
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

  const handleFinalizeSale = async () => { // 1. La convertimos en async
    if (currentTicket.length === 0) {
      alert("El ticket está vacío.");
      return;
    }
    
    // 2. Creamos un nuevo lote de escritura.
    const batch = writeBatch(db);
    const ticketId = Date.now();

    try {
      // 3. Iteramos sobre cada item en nuestro ticket local.
      currentTicket.forEach(ticketItem => {
        
        // --- Operación 1: Actualizar el inventario ---
        // Creamos la referencia al documento del producto que se vendió.
        const productDocRef = doc(db, 'users', user.uid, 'products', ticketItem.productId);
        // Encontramos el producto en nuestro estado local para obtener la cantidad actual.
        const productInStock = products.find(p => p.id === ticketItem.productId);
        const newQuantity = productInStock.quantity - ticketItem.quantity;
        
        // Añadimos la operación de actualización al lote.
        batch.update(productDocRef, { quantity: newQuantity });

        // --- Operación 2: Crear el registro de la venta ---
        // Creamos una referencia para el nuevo documento de venta.
        const saleDocRef = doc(collection(db, 'users', user.uid, 'sales'));
        
        // Creamos el objeto de la venta con todos los datos enriquecidos.
        const newSaleData = {
          ticketId: ticketId,
          productId: ticketItem.productId,
          productName: ticketItem.name,
          quantity: ticketItem.quantity,
          price: ticketItem.price,
          cost: ticketItem.cost,
          profit: (ticketItem.price - ticketItem.cost) * ticketItem.quantity,
          paymentMethod: paymentMethod,
          date: new Date().toISOString(), // Usamos formato ISO para facilitar ordenamiento futuro
        };

        // Añadimos la operación de creación al lote.
        batch.set(saleDocRef, newSaleData);
      });

      // 4. ¡Ejecutamos todas las operaciones del lote a la vez!
      await batch.commit();

      console.log("¡Venta finalizada y guardada en Firestore!");

      // 5. Limpiamos el estado local solo si todo fue exitoso.
      setCurrentTicket([]);
      setPaymentMethod('efectivo');

    } catch (error) {
      console.error("Error al finalizar la venta:", error);
      alert("Ocurrió un error al procesar la venta. Por favor, inténtalo de nuevo.");
    }
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