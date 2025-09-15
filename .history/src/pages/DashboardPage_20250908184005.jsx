import { useState, useEffect, useMemo } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion"; // <-- LA CORRECCIÓN ESTÁ AQUÍ
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import styles from "./DashboardPage.module.css";
import toast from "react-hot-toast";

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
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [activeTab, setActiveTab] = useState("ventas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // ... (El resto del código de tus funciones y useEffect se queda exactamente igual)
  useEffect(() => {
    if (!user) return;
    const productsCollectionRef = collection(db, "users", user.uid, "products");
    const unsubscribeProducts = onSnapshot(
      productsCollectionRef,
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(productsData);
      }
    );
    const salesCollectionRef = collection(db, "users", user.uid, "sales");
    const unsubscribeSales = onSnapshot(salesCollectionRef, (snapshot) => {
      const salesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      salesData.sort((a, b) => b.ticketId - a.ticketId);
      setSalesHistory(salesData);
    });
    return () => {
      unsubscribeProducts();
      unsubscribeSales();
    };
  }, [user]);

  const handleAddProduct = async (event) => {
    event.preventDefault();
    if (
      productName.trim() === "" ||
      isNaN(productQuantity) ||
      Number(productQuantity) <= 0 ||
      productPrice.trim() === "" ||
      isNaN(productPrice) ||
      Number(productPrice) < 0 ||
      productCost.trim() === "" ||
      isNaN(productCost) ||
      Number(productCost) < 0
    ) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }
    try {
      const productsCollectionRef = collection(
        db,
        "users",
        user.uid,
        "products"
      );
      const newProductData = {
        name: productName,
        quantity: Number(productQuantity),
        price: Number(productPrice),
        cost: Number(productCost),
      };
      await addDoc(productsCollectionRef, newProductData);
      toast.success("¡Producto añadido con éxito!");
      setProductName("");
      setProductQuantity("");
      setProductPrice("");
      setProductCost("");
    } catch (error) {
      console.error("Error al añadir el producto:", error);
      toast.error("Error al añadir el producto.");
    }
  };

  const handleIncrementQuantity = async (productId) => {
    try {
      const productToUpdate = products.find((p) => p.id === productId);
      const currentQuantity = productToUpdate.quantity;
      const productDocRef = doc(db, "users", user.uid, "products", productId);
      await updateDoc(productDocRef, {
        quantity: currentQuantity + 1,
      });
    } catch (error) {
      console.error("Error al incrementar la cantidad:", error);
      toast.error("No se pudo actualizar el producto.");
    }
  };

  const handleDecrementQuantity = async (productId) => {
    try {
      const productToUpdate = products.find((p) => p.id === productId);
      const currentQuantity = productToUpdate.quantity;
      if (currentQuantity <= 0) {
        console.warn("Se intentó decrementar un producto con stock 0.");
        return;
      }
      const productDocRef = doc(db, "users", user.uid, "products", productId);
      await updateDoc(productDocRef, {
        quantity: currentQuantity - 1,
      });
    } catch (error) {
      console.error("Error al decrementar la cantidad:", error);
      toast.error("No se pudo actualizar el producto.");
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar "${productName}"? Esta acción no se puede deshacer.`
      )
    ) {
      try {
        const productDocRef = doc(db, "users", user.uid, "products", productId);
        await deleteDoc(productDocRef);
        toast.success(`"${productName}" fue eliminado con éxito.`);
      } catch (error) {
        console.error("Error al eliminar el producto:", error);
        toast.error("No se pudo eliminar el producto.");
      }
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;
    try {
      const productDocRef = doc(
        db,
        "users",
        user.uid,
        "products",
        editingProduct.id
      );
      await updateDoc(productDocRef, {
        name: editingProduct.name,
        quantity: Number(editingProduct.quantity),
        price: Number(editingProduct.price),
        cost: Number(editingProduct.cost),
      });
      toast.success("Producto actualizado con éxito.");
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      toast.error("No se pudo actualizar el producto.");
    }
  };

  const handleAddItemToTicket = (event) => {
    event.preventDefault();
    if (!selectedProductId) {
      toast.error("Por favor, selecciona un producto.");
      return;
    }
    const productToAdd = products.find((p) => p.id === selectedProductId);
    if (!productToAdd) {
      toast.error("Producto no encontrado.");
      return;
    }
    if (productToAdd.quantity < saleQuantity) {
      toast.error(
        `Stock insuficiente. Solo quedan ${productToAdd.quantity} unidades.`
      );
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
    setSelectedProductId("");
    setSaleQuantity(1);
  };

  const handleFinalizeSale = async () => {
    if (currentTicket.length === 0) {
      toast.error("El ticket está vacío.");
      return;
    }
    const batch = writeBatch(db);
    const ticketId = Date.now();
    try {
      currentTicket.forEach((ticketItem) => {
        const productDocRef = doc(
          db,
          "users",
          user.uid,
          "products",
          ticketItem.productId
        );
        const productInStock = products.find(
          (p) => p.id === ticketItem.productId
        );
        const newQuantity = productInStock.quantity - ticketItem.quantity;
        batch.update(productDocRef, { quantity: newQuantity });
        const saleDocRef = doc(collection(db, "users", user.uid, "sales"));
        const newSaleData = {
          ticketId: ticketId,
          productId: ticketItem.productId,
          productName: ticketItem.name,
          quantity: ticketItem.quantity,
          price: ticketItem.price,
          cost: ticketItem.cost,
          profit: (ticketItem.price - ticketItem.cost) * ticketItem.quantity,
          paymentMethod: paymentMethod,
          date: new Date().toISOString(),
        };
        batch.set(saleDocRef, newSaleData);
      });
      await batch.commit();
      toast.success("¡Venta finalizada con éxito!");
      setCurrentTicket([]);
      setPaymentMethod("efectivo");
    } catch (error) {
      console.error("Error al finalizar la venta:", error);
      toast.error("Error al procesar la venta. Por favor, inténtalo de nuevo.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  // En src/pages/DashboardPage.jsx, reemplaza el useMemo existente

  const reportData = useMemo(() => {
    // 1. Agrupamos las ventas por ticketId
    const groupedSales = salesHistory.reduce((acc, sale) => {
      const ticketId = sale.ticketId;
      if (!acc[ticketId]) {
        // Si es la primera vez que vemos este ticket, lo inicializamos
        acc[ticketId] = {
          items: [],
          date: new Date(sale.date).toLocaleString("es-MX"),
          paymentMethod: sale.paymentMethod,
          total: 0,
        };
      }
      // Añadimos el item actual al ticket y sumamos al total
      acc[ticketId].items.push(sale);
      acc[ticketId].total += sale.price * sale.quantity;
      return acc;
    }, {});
    
    // Convertimos el objeto en un array y lo ordenamos, del más nuevo al más viejo
    const groupedSalesArray = Object.values(groupedSales).sort((a, b) => {
      // Obtenemos el primer item para acceder al ticketId original
      const ticketIdA = a.items[0].ticketId;
      const ticketIdB = b.items[0].ticketId;
      return ticketIdB - ticketIdA;
    });

    // 2. Los otros cálculos se mantienen, pero ahora usan el salesHistory original
    const totalRevenue = salesHistory.reduce((sum, sale) => sum + (sale.price * sale.quantity), 0);
    const totalProfit = salesHistory.reduce((sum, sale) => sum + sale.profit, 0);
    const totalSalesCount = Object.keys(groupedSales).length; // El número de tickets es el número de grupos
    const profitByProduct = salesHistory.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.profit;
      return acc;
    }, {});
    const mostProfitableProduct = Object.keys(profitByProduct).reduce((a, b) => (profitByProduct[a] > profitByProduct[b] ? a : b), "N/A");
    const inventoryValueByCost = products.reduce((sum, p) => sum + (p.cost * p.quantity), 0);
    const inventoryValueByPrice = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    // 3. Devolvemos la nueva estructura de datos agrupada
    return {
      groupedSalesArray, // <-- La nueva data agrupada
      totalRevenue,
      totalProfit,
      totalSalesCount,
      mostProfitableProduct,
      inventoryValueByCost,
      inventoryValueByPrice,
    };
  }, [salesHistory, products]);

  return (
    <motion.div
      className={styles.dashboardContainer}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.5 }}
    >
      {/* ... El resto de tu JSX se queda exactamente igual, lo he colapsado aquí para brevedad ... */}
      <div className={styles.header}>
        <h1 className={styles.title}>Gestión de Negocio</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Cerrar Sesión
        </button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${
            activeTab === "ventas" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("ventas")}
        >
          Ventas
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "inventario" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("inventario")}
        >
          Inventario
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "reportes" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("reportes")}
        >
          Reportes
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "ventas" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <section className={styles.card}>
              <h2>Crear Ticket de Venta</h2>
              <form
                onSubmit={handleAddItemToTicket}
                className={styles.salesFormGrid}
              >
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
                      <span>
                        {item.quantity} x {item.name}
                      </span>
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
                      checked={paymentMethod === "efectivo"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Efectivo
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="tarjeta"
                      checked={paymentMethod === "tarjeta"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    Tarjeta
                  </label>
                </div>
                <div className={styles.ticketTotal}>
                  <strong>TOTAL:</strong>
                  <span>
                    $
                    {currentTicket
                      .reduce(
                        (total, item) => total + item.price * item.quantity,
                        0
                      )
                      .toFixed(2)}
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

        {activeTab === "inventario" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
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
              <div className={styles.productGrid}>
                {products.length === 0 ? (
                  <p>No hay productos en el inventario.</p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className={styles.productCard}>
                      <div className={styles.productImagePlaceholder}></div>
                      <div className={styles.productCardInfo}>
                        <h4 className={styles.productCardName}>
                          {product.name}
                        </h4>
                        <p className={styles.productCardPrice}>
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <div className={styles.productCardStock}>
                        <p>Stock:</p>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => handleDecrementQuantity(product.id)}
                          >
                            -
                          </button>
                          <span className={styles.quantityText}>
                            {product.quantity}
                          </span>
                          <button
                            onClick={() => handleIncrementQuantity(product.id)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className={styles.productCardActions}>
                        <button
                          className={styles.actionButton}
                          onClick={() => openEditModal(product)}
                        >
                          Editar
                        </button>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() =>
                            handleDeleteProduct(product.id, product.name)
                          }
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "reportes" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <section className={styles.reportsGrid}>
              <div className={styles.reportCard}>
                <h4>Ingresos Totales</h4>
                <p>${reportData.totalRevenue.toFixed(2)}</p>
              </div>
              <div className={`${styles.reportCard} ${styles.profitCard}`}>
                <h4>Ganancia Neta</h4>
                <p>${reportData.totalProfit.toFixed(2)}</p>
              </div>
              <div className={styles.reportCard}>
                <h4>Ventas Realizadas</h4>
                <p>{reportData.totalSalesCount}</p>
              </div>
              <div className={styles.reportCard}>
                <h4>Producto Estrella</h4>
                <p className={styles.smallText}>
                  {reportData.mostProfitableProduct}
                </p>
              </div>
            </section>

            <section
              className={`${styles.reportsGrid} ${styles.secondaryReports}`}
            >
              <div className={styles.reportCard}>
                <h4>Valor de Inventario (Costo)</h4>
                <p>${reportData.inventoryValueByCost.toFixed(2)}</p>
              </div>
              <div className={styles.reportCard}>
                <h4>Potencial de Venta</h4>
                <p>${reportData.inventoryValueByPrice.toFixed(2)}</p>
              </div>
            </section>

            <section className={styles.card}>
              <h2>Historial Detallado de Ventas</h2>
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
                      <div className={styles.saleDetails}>
                        <span
                          className={`${styles.paymentBadge} ${
                            styles[sale.paymentMethod]
                          }`}
                        >
                          {sale.paymentMethod}
                        </span>
                        <span className={styles.profitText}>
                          +${sale.profit.toFixed(2)} Ganancia
                        </span>
                        <span className={styles.saleDate}>
                          {new Date(sale.date).toLocaleString("es-MX")}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && editingProduct && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.modalContent}
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
            >
              <h2>Editar Producto</h2>
              <form onSubmit={handleUpdateProduct}>
                <div className={styles.inputGroup}>
                  <label>Nombre del Producto</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Cantidad</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={editingProduct.quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, quantity: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Precio de Venta ($)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Costo de Adquisición ($)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={editingProduct.cost}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost: e.target.value })}
                  />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={styles.buttonSecondary}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.button}>
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DashboardPage;