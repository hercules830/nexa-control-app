import { useState, useEffect, useMemo } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
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
import HighlightText from "../components/HighlightText";

function DashboardPage({ user }) {
  // --- ESTADOS ---

  // Para la pestaña "Mis Productos"
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  
  // Para la pestaña "Insumos"
  const [insumos, setInsumos] = useState([]);
  const [newInsumo, setNewInsumo] = useState({
    name: "",
    quantity: "",
    unit: "", // Sin valor por defecto
    alertThreshold: "",
    cost: "",
  });

  // Para la pestaña "Ventas"
  const [salesHistory, setSalesHistory] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [currentTicket, setCurrentTicket] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // Para la UI general del Dashboard
  const [activeTab, setActiveTab] = useState("ventas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // Usaremos este para editar insumos y productos
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // --- EFECTOS (CONEXIÓN A FIRESTORE) ---

  useEffect(() => {
    if (!user) return;

    // Listener para "Mis Productos"
    const productsCollectionRef = collection(db, "users", user.uid, "products");
    const unsubscribeProducts = onSnapshot(
      productsCollectionRef,
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);
      }
    );

    // Listener para "Insumos"
    const insumosCollectionRef = collection(db, "users", user.uid, "insumos");
    const unsubscribeInsumos = onSnapshot(insumosCollectionRef, (snapshot) => {
      const insumosData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInsumos(insumosData);
    });

    // Listener para "Ventas"
    const salesCollectionRef = collection(db, "users", user.uid, "sales");
    const unsubscribeSales = onSnapshot(salesCollectionRef, (snapshot) => {
      const salesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a, b) => b.ticketId - a.ticketId);
      setSalesHistory(salesData);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeInsumos();
      unsubscribeSales();
    };
  }, [user]);

  // --- FUNCIONES CRUD PARA "MIS PRODUCTOS" ---
  
  const handleAddProduct = async (event) => {
    event.preventDefault();
    if (productName.trim() === "" || isNaN(productPrice) || productPrice === "" || isNaN(productCost) || productCost === "") {
      toast.error("Nombre, precio y costo son obligatorios.");
      return;
    }
    try {
      const productsCollectionRef = collection(db, "users", user.uid, "products");
      await addDoc(productsCollectionRef, {
        name: productName,
        price: Number(productPrice),
        cost: Number(productCost),
        // La cantidad de productos vendibles dependerá de las recetas en el futuro
      });
      toast.success("¡Producto añadido con éxito!");
      setProductName("");
      setProductPrice("");
      setProductCost("");
    } catch (error) {
      console.error("Error al añadir producto:", error);
      toast.error("Error al añadir el producto.");
    }
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;
    try {
      const productDocRef = doc(db, "users", user.uid, "products", editingProduct.id);
      await updateDoc(productDocRef, {
        name: editingProduct.name,
        price: Number(editingProduct.price),
        cost: Number(editingProduct.cost),
      });
      toast.success("Producto actualizado con éxito.");
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      toast.error("No se pudo actualizar el producto.");
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Seguro que quieres eliminar el producto "${productName}"?`)) {
      try {
        const productDocRef = doc(db, "users", user.uid, "products", productId);
        await deleteDoc(productDocRef);
        toast.success(`"${productName}" fue eliminado.`);
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        toast.error("No se pudo eliminar el producto.");
      }
    }
  };

  // --- FUNCIONES CRUD PARA "INSUMOS" ---

  const handleAddInsumo = async (event) => {
    event.preventDefault();
    if (newInsumo.name.trim() === "" || newInsumo.quantity.trim() === "" || isNaN(newInsumo.quantity) || newInsumo.unit === "") {
      toast.error("Nombre, cantidad y unidad son obligatorios.");
      return;
    }
    try {
      const insumosCollectionRef = collection(db, "users", user.uid, "insumos");
      await addDoc(insumosCollectionRef, {
        name: newInsumo.name,
        quantity: Number(newInsumo.quantity),
        unit: newInsumo.unit,
        alertThreshold: newInsumo.alertThreshold ? Number(newInsumo.alertThreshold) : null,
        cost: Number(newInsumo.cost), // <-- AÑADE EL CAMPO AL OBJETO GUARDADO
      });
      toast.success("¡Insumo añadido con éxito!");
      setNewInsumo({ name: "", quantity: "", unit: "", alertThreshold: "" });
    } catch (error) {
      console.error("Error al añadir el insumo:", error);
      toast.error("Error al añadir el insumo.");
    }
  };

  const handleIncrementInsumoQuantity = async (insumoId, currentQuantity) => {
    try {
      const insumoDocRef = doc(db, "users", user.uid, "insumos", insumoId);
      await updateDoc(insumoDocRef, { quantity: currentQuantity + 1 });
    } catch (error) {
      console.error("Error al incrementar insumo:", error);
      toast.error("No se pudo actualizar el insumo.");
    }
  };
  
  const handleDecrementInsumoQuantity = async (insumoId, currentQuantity) => {
    if (currentQuantity <= 0) return;
    try {
      const insumoDocRef = doc(db, "users", user.uid, "insumos", insumoId);
      await updateDoc(insumoDocRef, { quantity: currentQuantity - 1 });
    } catch (error) {
      console.error("Error al decrementar insumo:", error);
      toast.error("No se pudo actualizar el insumo.");
    }
  };

  // (Lógica para editar y borrar insumos se puede añadir aquí después)

  // --- LÓGICA DE VENTAS ---
  
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
    const newItem = {
      productId: productToAdd.id,
      name: productToAdd.name,
      quantity: saleQuantity,
      price: productToAdd.price,
      cost: productToAdd.cost || 0,
      recipe: productToAdd.recipe || [],
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
        // (Lógica futura para descontar insumos irá aquí)
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
      toast.error("Error al procesar la venta.");
    }
  };

  // --- OTRAS FUNCIONES ---

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const reportData = useMemo(() => {
    const filteredSales = selectedDate
      ? salesHistory.filter((sale) => {
          const saleDate = new Date(sale.date).toLocaleDateString("en-CA");
          return saleDate === selectedDate;
        })
      : salesHistory;

    const groupedSales = filteredSales.reduce((acc, sale) => {
      const ticketId = sale.ticketId;
      if (!acc[ticketId]) {
        acc[ticketId] = {
          ticketId: ticketId,
          items: [],
          date: new Date(sale.date).toLocaleString("es-MX"),
          paymentMethod: sale.paymentMethod,
          total: 0,
        };
      }
      acc[ticketId].items.push(sale);
      acc[ticketId].total += sale.price * sale.quantity;
      return acc;
    }, {});

    const groupedSalesArray = Object.values(groupedSales).sort(
      (a, b) => b.ticketId - a.ticketId
    );

    const totalRevenue = filteredSales.reduce(
      (sum, sale) => sum + sale.price * sale.quantity,
      0
    );
    const totalProfit = filteredSales.reduce(
      (sum, sale) => sum + sale.profit,
      0
    );
    const totalSalesCount = Object.keys(groupedSales).length;
    const profitByProduct = filteredSales.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.profit;
      return acc;
    }, {});
    const mostProfitableProduct = Object.keys(profitByProduct).reduce(
      (a, b) => (profitByProduct[a] > profitByProduct[b] ? a : b),
      "N/A"
    );

    // --- NUEVOS CÁLCULOS DE INVENTARIO ---
    // 1. Valor Real del Inventario de Insumos (basado en su costo de compra)
    const inventoryValueByCost = insumos.reduce(
      (sum, insumo) => sum + (insumo.cost || 0) * insumo.quantity,
      0
    );
    
    // 2. Potencial de Venta de los Productos Terminados (basado en su precio de venta)
    //    Nota: Esto NO considera el stock, solo el valor de los productos definidos.
    const productsPotentialValue = products.reduce(
      (sum, product) => sum + (product.price || 0),
      0 // Este es más un catálogo de precios que un valor de "stock vendible"
    );

    const inventoryValueByCost = insumos.reduce(
      (sum, insumo) => sum + (insumo.cost || 0) * insumo.quantity,
      0
    );
    const inventoryValueByPrice = insumos.reduce(
      (sum, insumo) => sum + (insumo.price || 0) * insumo.quantity,
      0
    );

    return {
      groupedSalesArray,
      totalRevenue,
      totalProfit,
      totalSalesCount,
      mostProfitableProduct,
      inventoryValueByCost,
      inventoryValueByPrice,
    };
    }, [salesHistory, insumos, selectedDate]);

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
          className={`${styles.tabButton} ${
            activeTab === "ventas" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("ventas")}
        >
          Ventas
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "products" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("products")}
        >
          Mis Productos
        </button>
        <button
          className={`${styles.tabButton} ${
            activeTab === "insumos" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("insumos")}
        >
          Insumos
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
                    <input type="radio" value="efectivo" checked={paymentMethod === "efectivo"} onChange={(e) => setPaymentMethod(e.target.value)}/>
                    Efectivo
                  </label>
                  <label>
                    <input type="radio" value="tarjeta" checked={paymentMethod === "tarjeta"} onChange={(e) => setPaymentMethod(e.target.value)}/>
                    Tarjeta
                  </label>
                </div>
                <div className={styles.ticketTotal}>
                  <strong>TOTAL:</strong>
                  <span>
                    ${currentTicket.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}
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

        {activeTab === "products" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <section className={styles.card}>
              <h2>Agregar Nuevo Producto</h2>
              <form onSubmit={handleAddProduct} className={styles.productFormGrid}>
                <input type="text" placeholder="Nombre del Producto" className={styles.input} value={productName} onChange={(e) => setProductName(e.target.value)} />
                <input type="number" placeholder="Precio de Venta ($)" className={styles.input} value={productPrice} onChange={(e) => setProductPrice(e.target.value)} min="0"/>
                <input type="number" placeholder="Costo de Producción ($)" className={styles.input} value={productCost} onChange={(e) => setProductCost(e.target.value)} min="0"/>
                <button type="submit" className={styles.button}>Agregar Producto</button>
              </form>
            </section>
            <section className={styles.card}>
              <h2>Mis Productos Vendibles</h2>
              <div className={styles.productGrid}>
                {products.length === 0 ? (
                  <p>No has agregado productos vendibles.</p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className={styles.productCard}>
                      <div className={styles.productImagePlaceholder}></div>
                      <div className={styles.productCardInfo}>
                        <h4 className={styles.productCardName}>{product.name}</h4>
                        <p className={styles.productCardPrice}>${product.price.toFixed(2)}</p>
                      </div>
                      <div className={styles.productCardActions}>
                        <button className={styles.actionButton} onClick={() => openEditModal(product)}>Editar</button>
                        <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeleteProduct(product.id, product.name)}>Borrar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === "insumos" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <section className={styles.card}>
              <h2>Agregar Nuevo Insumo</h2>
              <form onSubmit={handleAddInsumo} className={styles.insumoFormGrid}>
                <input
                  type="text"
                  placeholder="Nombre del Insumo"
                  className={styles.input}
                  value={newInsumo.name}
                  onChange={(e) => setNewInsumo({ ...newInsumo, name: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Cantidad"
                  className={styles.input}
                  value={newInsumo.quantity}
                  onChange={(e) => setNewInsumo({ ...newInsumo, quantity: e.target.value })}
                />
                <select
                  className={styles.input}
                  value={newInsumo.unit}
                  onChange={(e) => setNewInsumo({ ...newInsumo, unit: e.target.value })}
                >
                  <option value="" disabled>-- Selecciona Unidad --</option>
                  <option value="pz">Pieza (pz)</option>
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="g">Gramo (g)</option>
                  <option value="lt">Litro (lt)</option>
                  <option value="ml">Mililitro (ml)</option>
                </select>

                <input
                  type="number"
                  placeholder="Costo por Unidad ($)"
                  className={styles.input}
                  value={newInsumo.cost}
                  onChange={(e) => setNewInsumo({ ...newInsumo, cost: e.target.value })}
                  min="0"
                />

                <input
                  type="number"
                  placeholder="Alerta de Stock (Opcional)"
                  className={styles.input}
                  value={newInsumo.alertThreshold}
                  onChange={(e) => setNewInsumo({ ...newInsumo, alertThreshold: e.target.value })}
                />
                <button type="submit" className={styles.button}>Agregar Insumo</button>
              </form>
            </section>


                <input
                  type="number"
                  placeholder="Alerta de Stock (Opcional)"
                  className={styles.input}
                  value={newInsumo.alertThreshold}
                  onChange={(e) => setNewInsumo({ ...newInsumo, alertThreshold: e.target.value })}
                />
                <button type="submit" className={styles.button}>Agregar Insumo</button>
              </form>
            </section>
            <section className={styles.card}>
              <h2>Inventario de Insumos</h2>
              <div className={styles.searchBar}>
                <input
                  type="text"
                  placeholder="Buscar insumo por nombre..."
                  className={styles.input}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {(() => {
                const filteredInsumos = insumos.filter((insumo) =>
                  insumo.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                  <ul className={styles.insumoList}>
                    {filteredInsumos.length === 0 ? (
                      <p>No se encontraron insumos.</p>
                    ) : (
                      filteredInsumos.map((insumo) => (
                        <li
                          key={insumo.id}
                          className={`${styles.insumoItem} ${
                            (insumo.alertThreshold != null && insumo.quantity <= insumo.alertThreshold)
                              ? styles.lowStock
                              : ""
                          }`}
                        >
                          <span className={styles.insumoName}>
                            <HighlightText text={insumo.name} highlight={searchTerm} />
                          </span>
                          <div className={styles.insumoDetails}>
                            <div className={styles.actionButtons}>
                              <button onClick={() => handleDecrementInsumoQuantity(insumo.id, insumo.quantity)}>-</button>
                              <span className={styles.quantityText}>
                                {insumo.quantity} <span className={styles.unitText}>{insumo.unit}</span>
                              </span>
                              <button onClick={() => handleIncrementInsumoQuantity(insumo.id, insumo.quantity)}>+</button>
                            </div>
                            {/* (Botones de editar/borrar para insumos irán aquí) */}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                );
              })()}
            </section>
          </motion.div>
        )}

        {activeTab === "reportes" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.filterControls}>
              <label htmlFor="date-filter">Filtrar por fecha:</label>
              <input type="date" id="date-filter" className={styles.input} value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)}/>
              {selectedDate && (
                <button onClick={() => setSelectedDate(null)} className={styles.clearButton}>
                  Ver Todas
                </button>
              )}
            </div>
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
                <h4>Valor de Insumos (Costo)</h4>
                <p>${reportData.inventoryValueByCost.toFixed(2)}</p>
              </div>
              <div className={styles.reportCard}>
                <h4>Productos Definidos</h4>
                <p>{products.length}</p>
              </div>
            </section>
            <section className={styles.card}>
              <h2>Historial Detallado de Ventas</h2>
              <ul className={styles.ticketGroupList}>
                {reportData.groupedSalesArray.length === 0 ? (
                  <p>Aún no se han registrado ventas.</p>
                ) : (
                  reportData.groupedSalesArray.map((ticket) => (
                    <li key={ticket.ticketId} className={styles.ticketGroup}>
                      <div className={styles.ticketHeader}>
                        <div className={styles.ticketDetails}>
                          <span className={styles.ticketDate}>{ticket.date}</span>
                          <span className={`${styles.paymentBadge} ${styles[ticket.paymentMethod]}`}>
                            {ticket.paymentMethod}
                          </span>
                        </div>
                        <div className={styles.ticketTotalLarge}>
                          Total: <span>${ticket.total.toFixed(2)}</span>
                        </div>
                      </div>
                      <ul className={styles.ticketItemList}>
                        {ticket.items.map((item) => (
                          <li key={item.id} className={styles.ticketItemDetail}>
                            <span>{item.quantity} x {item.productName}</span>
                            <span>+${item.profit.toFixed(2)} ganancia</span>
                          </li>
                        ))}
                      </ul>
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
                  <input type="text" className={styles.input} value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}/>
                </div>
                <div className={styles.inputGroup}>
                  <label>Precio de Venta ($)</label>
                  <input type="number" className={styles.input} value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}/>
                </div>
                <div className={styles.inputGroup}>
                  <label>Costo de Producción ($)</label>
                  <input type="number" className={styles.input} value={editingProduct.cost} onChange={(e) => setEditingProduct({ ...editingProduct, cost: e.target.value })}/>
                </div>
                <div className={styles.modalActions}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={styles.buttonSecondary}>Cancelar</button>
                  <button type="submit" className={styles.button}>Guardar Cambios</button>
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