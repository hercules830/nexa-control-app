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

  const [products, setProducts] = useState([]); // Para "Mis Productos"
  const [insumos, setInsumos] = useState([]);   // Para "Insumos"
  const [salesHistory, setSalesHistory] = useState([]);

  // Estados para el formulario de NUEVO PRODUCTO
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    type: "direct", // 'direct' para Insumo Directo, 'recipe' para Receta
    insumoId: "",  // Para el tipo 'direct'
    recipe: [],    // Para el tipo 'recipe'
  });
  const [selectedInsumoIdForRecipe, setSelectedInsumoIdForRecipe] = useState("");
  const [recipeQuantity, setRecipeQuantity] = useState("");

  // Estados para el formulario de NUEVO INSUMO
  const [newInsumo, setNewInsumo] = useState({
    name: "",
    quantity: "",
    unit: "",
    cost: "",
    alertThreshold: "",
  });
  
  // Estados para VENTAS
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [currentTicket, setCurrentTicket] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  // Estados para la UI
  const [activeTab, setActiveTab] = useState("ventas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;
    const productsCollectionRef = collection(db, "users", user.uid, "products");
    const unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const insumosCollectionRef = collection(db, "users", user.uid, "insumos");
    const unsubscribeInsumos = onSnapshot(insumosCollectionRef, (snapshot) => {
      setInsumos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const salesCollectionRef = collection(db, "users", user.uid, "sales");
    const unsubscribeSales = onSnapshot(salesCollectionRef, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      salesData.sort((a, b) => b.ticketId - a.ticketId);
      setSalesHistory(salesData);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeInsumos();
      unsubscribeSales();
    };
  }, [user]);

  // --- FUNCIONES PARA "MIS PRODUCTOS" ---

  const handleAddProduct = async (event) => {
    event.preventDefault();
    if (newProduct.name.trim() === "" || newProduct.price.trim() === "" || isNaN(newProduct.price)) {
      toast.error("Nombre y precio del producto son obligatorios.");
      return;
    }

    let finalCost = 0;
    let finalRecipe = [];
    let insumoDirectoId = null;

    if (newProduct.type === 'recipe') {
      if (newProduct.recipe.length === 0) {
        toast.error("Para un producto con receta, debes agregar al menos un insumo.");
        return;
      }
      finalCost = newProduct.recipe.reduce((sum, item) => sum + (item.quantityUsed * item.cost), 0);
      finalRecipe = newProduct.recipe;
    } else { // tipo 'direct'
      if (!newProduct.insumoId) {
        toast.error("Para un producto de reventa, debes seleccionar el insumo correspondiente.");
        return;
      }
      const insumoSource = insumos.find(i => i.id === newProduct.insumoId);
      finalCost = insumoSource.cost;
      insumoDirectoId = newProduct.insumoId;
    }

    try {
      const productsCollectionRef = collection(db, "users", user.uid, "products");
      await addDoc(productsCollectionRef, {
        name: newProduct.name,
        price: Number(newProduct.price),
        cost: finalCost,
        type: newProduct.type,
        recipe: finalRecipe,
        insumoId: insumoDirectoId
      });
      toast.success("¡Producto guardado con éxito!");
      setNewProduct({ name: "", price: "", type: "direct", insumoId: "", recipe: [] });
    } catch (error) {
      console.error("Error al añadir producto:", error);
      toast.error("Error al guardar el producto.");
    }
  };
  
  const handleAddRecipeItem = () => {
    if (!selectedInsumoIdForRecipe || !recipeQuantity || isNaN(recipeQuantity) || Number(recipeQuantity) <= 0) {
      toast.error("Selecciona un insumo y una cantidad válida.");
      return;
    }
    const insumoDetails = insumos.find(i => i.id === selectedInsumoIdForRecipe);
    if (!insumoDetails) {
      toast.error("Insumo no encontrado.");
      return;
    }
    const newItem = {
      insumoId: insumoDetails.id,
      name: insumoDetails.name,
      unit: insumoDetails.unit,
      quantityUsed: Number(recipeQuantity),
      cost: insumoDetails.cost,
    };
    setNewProduct(prev => ({ ...prev, recipe: [...prev.recipe, newItem] }));
    setSelectedInsumoIdForRecipe("");
    setRecipeQuantity("");
  };

  const handleRemoveRecipeItem = (index) => {
    setNewProduct(prev => ({ ...prev, recipe: prev.recipe.filter((_, i) => i !== index) }));
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Seguro que quieres eliminar el producto "${productName}"?`)) {
      try {
        const productDocRef = doc(db, "users", user.uid, "products", productId);
        await deleteDoc(productDocRef);
        toast.success(`"${productName}" fue eliminado.`);
      } catch (error) {
        toast.error("No se pudo eliminar el producto.");
      }
    }
  };

  // (handleUpdateProduct lo refactorizaremos después para incluir recetas)

  // --- FUNCIONES CRUD PARA "INSUMOS" ---

  const handleAddInsumo = async (event) => {
    event.preventDefault();
    if (newInsumo.name.trim() === "" || newInsumo.quantity.trim() === "" || isNaN(newInsumo.quantity) || newInsumo.unit === "" || newInsumo.cost.trim() === "" || isNaN(newInsumo.cost)) {
      toast.error("Nombre, cantidad, unidad y costo son obligatorios.");
      return;
    }
    try {
      const insumosCollectionRef = collection(db, "users", user.uid, "insumos");
      await addDoc(insumosCollectionRef, {
        name: newInsumo.name,
        quantity: Number(newInsumo.quantity),
        unit: newInsumo.unit,
        cost: Number(newInsumo.cost),
        alertThreshold: newInsumo.alertThreshold ? Number(newInsumo.alertThreshold) : null,
      });
      toast.success("¡Insumo añadido con éxito!");
      setNewInsumo({ name: "", quantity: "", unit: "", cost: "", alertThreshold: "" });
    } catch (error) {
      toast.error("Error al añadir el insumo.");
    }
  };

  const handleIncrementInsumoQuantity = async (insumoId, currentQuantity) => {
    try {
      const insumoDocRef = doc(db, "users", user.uid, "insumos", insumoId);
      await updateDoc(insumoDocRef, { quantity: currentQuantity + 1 });
    } catch (error) {
      toast.error("No se pudo actualizar el insumo.");
    }
  };
  
  const handleDecrementInsumoQuantity = async (insumoId, currentQuantity) => {
    if (currentQuantity <= 0) return;
    try {
      const insumoDocRef = doc(db, "users", user.uid, "insumos", insumoId);
      await updateDoc(insumoDocRef, { quantity: currentQuantity - 1 });
    } catch (error) {
      toast.error("No se pudo actualizar el insumo.");
    }
  };
  
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
      type: productToAdd.type,
      insumoId: productToAdd.insumoId
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
      for (const ticketItem of currentTicket) {
        if (ticketItem.type === 'recipe') {
          for (const recipeItem of ticketItem.recipe) {
            const insumoDocRef = doc(db, "users", user.uid, "insumos", recipeItem.insumoId);
            const insumoInStock = insumos.find(i => i.id === recipeItem.insumoId);
            const quantityToDeduct = recipeItem.quantityUsed * ticketItem.quantity;
            if (insumoInStock.quantity < quantityToDeduct) {
              toast.error(`Stock insuficiente para "${insumoInStock.name}". Venta cancelada.`);
              return;
            }
            batch.update(insumoDocRef, { quantity: insumoInStock.quantity - quantityToDeduct });
          }
        } else { // type 'direct'
          const insumoDocRef = doc(db, "users", user.uid, "insumos", ticketItem.insumoId);
          const insumoInStock = insumos.find(i => i.id === ticketItem.insumoId);
          const quantityToDeduct = ticketItem.quantity;
           if (insumoInStock.quantity < quantityToDeduct) {
              toast.error(`Stock insuficiente para "${insumoInStock.name}". Venta cancelada.`);
              return;
            }
          batch.update(insumoDocRef, { quantity: insumoInStock.quantity - quantityToDeduct });
        }
        
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
      }
      await batch.commit();
      toast.success("¡Venta finalizada y stock actualizado!");
      setCurrentTicket([]);
      setPaymentMethod("efectivo");
    } catch (error) {
      console.error("Error al finalizar la venta:", error);
      toast.error("Error al procesar la venta.");
    }
  };
  
  const handleLogout = async () => { /*...*/ };
  const openEditModal = (product) => { /*...*/ };
  const reportData = useMemo(() => { /*...*/ }, [salesHistory, products, insumos, selectedDate]);
  
  return (
    <motion.div className={styles.dashboardContainer} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.5 }}>
      <div className={styles.header}>
        <h1 className={styles.title}>Gestión de Negocio</h1>
        <button onClick={handleLogout} className={styles.logoutButton}>Cerrar Sesión</button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabButton} ${activeTab === "ventas" ? styles.activeTab : ""}`} onClick={() => setActiveTab("ventas")}>Ventas</button>
        <button className={`${styles.tabButton} ${activeTab === "products" ? styles.activeTab : ""}`} onClick={() => setActiveTab("products")}>Mis Productos</button>
        <button className={`${styles.tabButton} ${activeTab === "insumos" ? styles.activeTab : ""}`} onClick={() => setActiveTab("insumos")}>Insumos</button>
        <button className={`${styles.tabButton} ${activeTab === "reportes" ? styles.activeTab : ""}`} onClick={() => setActiveTab("reportes")}>Reportes</button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === "ventas" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <section className={styles.card}>
                <h2>Crear Ticket de Venta</h2>
                <form onSubmit={handleAddItemToTicket} className={styles.salesFormGrid}>
                    <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className={styles.input}>
                    <option value="" disabled>-- Selecciona un producto --</option>
                    {products.map((product) => (<option key={product.id} value={product.id}>{product.name}</option>))}
                    </select>
                    <input type="number" placeholder="Cantidad" className={styles.input} value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} min="1"/>
                    <button type="submit" className={styles.button}>Agregar al Ticket</button>
                </form>
                </section>
                <section className={styles.card}>
                    <h2>Ticket Actual</h2>
                    <ul className={styles.ticketList}>
                        {currentTicket.length === 0 ? (<p>Añade productos para empezar un nuevo ticket.</p>) : (currentTicket.map((item, index) => (<li key={index} className={styles.ticketItem}><span>{item.quantity} x {item.name}</span><span>${(item.price * item.quantity).toFixed(2)}</span></li>)))}
                    </ul>
                    <div className={styles.ticketSummary}>
                        <div className={styles.paymentOptions}>
                        <label><input type="radio" value="efectivo" checked={paymentMethod === "efectivo"} onChange={(e) => setPaymentMethod(e.target.value)}/>Efectivo</label>
                        <label><input type="radio" value="tarjeta" checked={paymentMethod === "tarjeta"} onChange={(e) => setPaymentMethod(e.target.value)}/>Tarjeta</label>
                        </div>
                        <div className={styles.ticketTotal}>
                        <strong>TOTAL:</strong>
                        <span>${currentTicket.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <button onClick={handleFinalizeSale} className={styles.finalizeButton} disabled={currentTicket.length === 0}>Finalizar Venta</button>
                </section>
            </motion.div>
        )}

        {activeTab === "products" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <section className={styles.card}>
                    <h2>Agregar Nuevo Producto</h2>
                    <form onSubmit={handleAddProduct} className={styles.productFormGrid}>
                        <input type="text" placeholder="Nombre del Producto" className={styles.input} value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}/>
                        <input type="number" placeholder="Precio de Venta ($)" className={styles.input} value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} min="0"/>
                        
                        <div className={styles.productTypeSelector}>
                            <label><input type="radio" value="direct" checked={newProduct.type === 'direct'} onChange={(e) => setNewProduct({...newProduct, type: e.target.value, recipe: []})}/> Reventa (Insumo Directo)</label>
                            <label><input type="radio" value="recipe" checked={newProduct.type === 'recipe'} onChange={(e) => setNewProduct({...newProduct, type: e.target.value, insumoId: ''})}/> Producido (con Receta)</label>
                        </div>

                        {newProduct.type === 'direct' && (
                            <select value={newProduct.insumoId} onChange={(e) => setNewProduct({...newProduct, insumoId: e.target.value})} className={styles.input}>
                                <option value="">-- Selecciona el Insumo de Reventa --</option>
                                {insumos.map(insumo => (<option key={insumo.id} value={insumo.id}>{insumo.name}</option>))}
                            </select>
                        )}
                        
                        {newProduct.type === 'recipe' && (
                            <>
                                <h3 className={styles.recipeTitle}>Definir Receta</h3>
                                <div className={styles.recipeFormGrid}>
                                <select value={selectedInsumoIdForRecipe} onChange={(e) => setSelectedInsumoIdForRecipe(e.target.value)} className={styles.input}>
                                    <option value="" disabled>-- Selecciona Insumo --</option>
                                    {insumos.map(insumo => (<option key={insumo.id} value={insumo.id}>{insumo.name} ({insumo.unit})</option>))}
                                </select>
                                <input type="number" placeholder="Cantidad usada" className={styles.input} value={recipeQuantity} onChange={(e) => setRecipeQuantity(e.target.value)} min="0"/>
                                <button type="button" onClick={handleAddRecipeItem} className={styles.addRecipeButton}>+</button>
                                </div>
                                <ul className={styles.recipeList}>
                                {newProduct.recipe.length === 0 ? (<li className={styles.recipeEmpty}>Aún no hay ingredientes en la receta.</li>) : (newProduct.recipe.map((item, index) => (<li key={index} className={styles.recipeItem}><span>{item.quantityUsed} {item.unit} de {item.name}</span><button type="button" onClick={() => handleRemoveRecipeItem(index)} className={styles.removeRecipeButton}>x</button></li>)))}
                                </ul>
                            </>
                        )}
                        <button type="submit" className={styles.button}>Guardar Producto</button>
                    </form>
                </section>
                <section className={styles.card}>
                    <h2>Mis Productos Vendibles</h2>
                    <div className={styles.productGrid}>
                        {products.length === 0 ? (<p>No has agregado productos.</p>) : (products.map((product) => (
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
                        )))}
                    </div>
                </section>
            </motion.div>
        )}

        {activeTab === "insumos" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <section className={styles.card}>
              <h2>Agregar Nuevo Insumo</h2>
              <form onSubmit={handleAddInsumo} className={styles.insumoFormGrid}>
                <input type="text" placeholder="Nombre del Insumo" className={styles.input} value={newInsumo.name} onChange={(e) => setNewInsumo({ ...newInsumo, name: e.target.value })}/>
                <input type="number" placeholder="Cantidad" className={styles.input} value={newInsumo.quantity} onChange={(e) => setNewInsumo({ ...newInsumo, quantity: e.target.value })}/>
                <select className={styles.input} value={newInsumo.unit} onChange={(e) => setNewInsumo({ ...newInsumo, unit: e.target.value })}>
                  <option value="" disabled>-- Selecciona Unidad --</option>
                  <option value="pz">Pieza (pz)</option>
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="g">Gramo (g)</option>
                  <option value="lt">Litro (lt)</option>
                  <option value="ml">Mililitro (ml)</option>
                </select>
                <input type="number" placeholder="Costo por Unidad ($)" className={styles.input} value={newInsumo.cost} onChange={(e) => setNewInsumo({ ...newInsumo, cost: e.target.value })} min="0"/>
                <input type="number" placeholder="Alerta de Stock (Opcional)" className={styles.input} value={newInsumo.alertThreshold} onChange={(e) => setNewInsumo({ ...newInsumo, alertThreshold: e.target.value })}/>
                <button type="submit" className={styles.button}>Agregar Insumo</button>
              </form>
            </section>
            <section className={styles.card}>
              <h2>Inventario de Insumos</h2>
              <div className={styles.searchBar}>
                <input type="text" placeholder="Buscar insumo por nombre..." className={styles.input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
              {(() => {
                const filteredInsumos = insumos.filter((insumo) => insumo.name.toLowerCase().includes(searchTerm.toLowerCase()));
                return (
                  <ul className={styles.insumoList}>
                    {filteredInsumos.length === 0 ? (<p>No se encontraron insumos.</p>) : (filteredInsumos.map((insumo) => (
                      <li key={insumo.id} className={`${styles.insumoItem} ${(insumo.alertThreshold != null && insumo.quantity <= insumo.alertThreshold) ? styles.lowStock : ""}`}>
                        <span className={styles.insumoName}><HighlightText text={insumo.name} highlight={searchTerm} /></span>
                        <div className={styles.insumoDetails}>
                          <div className={styles.actionButtons}>
                            <button onClick={() => handleDecrementInsumoQuantity(insumo.id, insumo.quantity)}>-</button>
                            <span className={styles.quantityText}>{insumo.quantity} <span className={styles.unitText}>{insumo.unit}</span></span>
                            <button onClick={() => handleIncrementInsumoQuantity(insumo.id, insumo.quantity)}>+</button>
                          </div>
                        </div>
                      </li>
                    )))}
                  </ul>
                );
              })()}
            </section>
          </motion.div>
        )}

        {activeTab === "reportes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className={styles.filterControls}>
              <label htmlFor="date-filter">Filtrar por fecha:</label>
              <input type="date" id="date-filter" className={styles.input} value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)}/>
              {selectedDate && (<button onClick={() => setSelectedDate(null)} className={styles.clearButton}>Ver Todas</button>)}
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
                <p className={styles.smallText}>{reportData.mostProfitableProduct}</p>
              </div>
            </section>
            <section className={`${styles.reportsGrid} ${styles.secondaryReports}`}>
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
                {reportData.groupedSalesArray.length === 0 ? (<p>Aún no se han registrado ventas.</p>) : (reportData.groupedSalesArray.map((ticket) => (
                  <li key={ticket.ticketId} className={styles.ticketGroup}>
                    <div className={styles.ticketHeader}>
                      <div className={styles.ticketDetails}>
                        <span className={styles.ticketDate}>{ticket.date}</span>
                        <span className={`${styles.paymentBadge} ${styles[ticket.paymentMethod]}`}>{ticket.paymentMethod}</span>
                      </div>
                      <div className={styles.ticketTotalLarge}>
                        Total: <span>${ticket.total.toFixed(2)}</span>
                      </div>
                    </div>
                    <ul className={styles.ticketItemList}>
                      {ticket.items.map((item) => (<li key={item.id} className={styles.ticketItemDetail}><span>{item.quantity} x {item.productName}</span><span>+${item.profit.toFixed(2)} ganancia</span></li>))}
                    </ul>
                  </li>
                )))}
              </ul>
            </section>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && editingProduct && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}>
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