import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./DashboardPage.module.css";
import toast from "react-hot-toast";
import HighlightText from "../components/HighlightText";
import SalesChart from "../components/SalesChart";
import ProfileDropdown from '../components/ProfileDropdown.jsx';
import PasswordSettingForm from '../components/PasswordSettingForm.jsx';

function DashboardPage({ user }) {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", type: "direct", insumoId: "", recipe: [], imageFile: null });
  const [selectedInsumoIdForRecipe, setSelectedInsumoIdForRecipe] = useState("");
  const [recipeQuantity, setRecipeQuantity] = useState("");
  const [newInsumo, setNewInsumo] = useState({ name: "", purchaseQuantity: "", purchaseUnit: "kg", totalCost: "", usageUnit: "g", conversionRate: "", alertThreshold: "" });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [currentTicket, setCurrentTicket] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [activeTab, setActiveTab] = useState("ventas");
  const [currentView, setCurrentView] = useState('tabs'); // <-- NUEVO ESTADO
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByProductId, setFilterByProductId] = useState("");
  const navigate = useNavigate(); // <-- NUEVO HOOK

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) toast.error("Error al cargar productos.");
    else setProducts(data || []);
  };

  const fetchInsumos = async () => {
    const { data, error } = await supabase.from("insumos").select("*");
    if (error) toast.error("Error al cargar insumos.");
    else setInsumos(data || []);
  };

  const fetchSales = async () => {
    const { data, error } = await supabase.from("sales").select("*").order("ticketId", { ascending: false });
    if (error) toast.error("Error al cargar ventas.");
    else setSalesHistory(data || []);
  };

  useEffect(() => {
    if (!user) return;
    fetchProducts();
    fetchInsumos();
    fetchSales();
    const channel = supabase.channel("public-db-changes").on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        if (payload.table === "products") fetchProducts();
        else if (payload.table === "insumos") fetchInsumos();
        else if (payload.table === "sales") fetchSales();
      }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleAddProduct = async (event) => {
    event.preventDefault();
    setIsUploading(true);
    if (newProduct.price.trim() === "" || isNaN(newProduct.price)) {
      toast.error("El precio del producto es obligatorio.");
      setIsUploading(false);
      return;
    }
    let imageUrl = null;
    if (newProduct.imageFile) {
      const file = newProduct.imageFile;
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      try {
        const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        imageUrl = data.publicUrl;
      } catch (error) {
        toast.error("Error al subir la imagen: " + error.message);
        setIsUploading(false);
        return;
      }
    }
    let finalCost = 0;
    let finalRecipe = [];
    let insumoDirectoId = null;
    let finalName = newProduct.name;
    if (newProduct.type === "recipe") {
      if (newProduct.name.trim() === "") {
        toast.error("El nombre del producto es obligatorio para recetas.");
        setIsUploading(false);
        return;
      }
      if (newProduct.recipe.length === 0) {
        toast.error("Para un producto con receta, debes agregar al menos un insumo.");
        setIsUploading(false);
        return;
      }
      finalCost = newProduct.recipe.reduce((sum, item) => sum + item.quantityUsed * item.cost, 0);
      finalRecipe = newProduct.recipe;
    } else {
      if (!newProduct.insumoId) {
        toast.error("Para un producto de reventa, debes seleccionar el insumo correspondiente.");
        setIsUploading(false);
        return;
      }
      const insumoSource = insumos.find((i) => i.id === Number(newProduct.insumoId));
      if (!insumoSource) {
        toast.error("El insumo seleccionado ya no existe.");
        setIsUploading(false);
        return;
      }
      finalCost = insumoSource.costPerUsageUnit;
      insumoDirectoId = Number(newProduct.insumoId);
      finalName = insumoSource.name;
    }
    try {
      const { error } = await supabase.from("products").insert([{ name: finalName, price: Number(newProduct.price), cost: finalCost, type: newProduct.type, recipe: finalRecipe, insumoId: insumoDirectoId, image_url: imageUrl, user_id: user.id }]);
      if (error) throw error;
      toast.success("¡Producto guardado con éxito!");
      fetchProducts();
      setNewProduct({ name: "", price: "", type: "direct", insumoId: "", recipe: [], imageFile: null });
    } catch (error) {
      toast.error(error.message || "Error al guardar el producto.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddRecipeItem = () => {
    if (!selectedInsumoIdForRecipe || !recipeQuantity || isNaN(recipeQuantity) || Number(recipeQuantity) <= 0) {
      toast.error("Selecciona un insumo y una cantidad válida.");
      return;
    }
    const insumoDetails = insumos.find((i) => i.id === Number(selectedInsumoIdForRecipe));
    if (!insumoDetails) {
      toast.error("Insumo no encontrado.");
      return;
    }
    const newItem = { insumoId: insumoDetails.id, name: insumoDetails.name, unit: insumoDetails.usageUnit, quantityUsed: Number(recipeQuantity), cost: insumoDetails.costPerUsageUnit };
    setNewProduct((prev) => ({ ...prev, recipe: [...prev.recipe, newItem] }));
    setSelectedInsumoIdForRecipe("");
    setRecipeQuantity("");
  };

  const handleRemoveRecipeItem = (index) => {
    setNewProduct((prev) => ({...prev, recipe: prev.recipe.filter((_, i) => i !== index)}));
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Seguro que quieres eliminar el producto "${productName}"?`)) {
      try {
        const productToDelete = products.find((p) => p.id === productId);
        if (productToDelete && productToDelete.image_url) {
          const oldFileName = productToDelete.image_url.split("/").pop();
          await supabase.storage.from("product-images").remove([oldFileName]);
        }
        const { error } = await supabase.from("products").delete().eq("id", productId);
        if (error) throw error;
        toast.success(`"${productName}" fue eliminado.`);
        fetchProducts();
      } catch (error) {
        toast.error(error.message || "No se pudo eliminar el producto.");
      }
    }
  };

  const handleAddRecipeItemToEdit = () => {
    if (!selectedInsumoIdForRecipe || !recipeQuantity || isNaN(recipeQuantity) || Number(recipeQuantity) <= 0) {
      toast.error("Selecciona un insumo y una cantidad válida.");
      return;
    }
    const insumoDetails = insumos.find((i) => i.id === Number(selectedInsumoIdForRecipe));
    if (!insumoDetails) {
      toast.error("Insumo no encontrado.");
      return;
    }
    const newItem = { insumoId: insumoDetails.id, name: insumoDetails.name, unit: insumoDetails.usageUnit, quantityUsed: Number(recipeQuantity), cost: insumoDetails.costPerUsageUnit };
    setEditingItem((prev) => ({...prev, recipe: [...(prev.recipe || []), newItem]}));
    setSelectedInsumoIdForRecipe("");
    setRecipeQuantity("");
  };

  const handleRemoveRecipeItemFromEdit = (index) => {
    setEditingItem((prev) => ({...prev, recipe: prev.recipe.filter((_, i) => i !== index)}));
  };

  const handleUpdateProduct = async (event) => {
    event.preventDefault();
    if (!editingItem) return;
    setIsUploading(true);
    let updatedImageUrl = editingItem.image_url;
    if (editingItem.newImageFile) {
      const file = editingItem.newImageFile;
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      try {
        await supabase.storage.from("product-images").upload(filePath, file);
        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        updatedImageUrl = data.publicUrl;
        if (editingItem.image_url) {
          const oldFileName = editingItem.image_url.split("/").pop();
          await supabase.storage.from("product-images").remove([oldFileName]);
        }
      } catch (error) {
        toast.error("Error al actualizar la imagen: " + error.message);
        setIsUploading(false);
        return;
      }
    }
    let finalCost = editingItem.cost;
    if (editingItem.type === "recipe") {
      finalCost = editingItem.recipe.reduce((sum, item) => sum + item.quantityUsed * item.cost, 0);
    }
    try {
      const { error } = await supabase.from("products").update({ name: editingItem.name, price: Number(editingItem.price), cost: finalCost, recipe: editingItem.recipe || [], image_url: updatedImageUrl }).eq("id", editingItem.id);
      if (error) throw error;
      toast.success("Producto actualizado con éxito.");
      fetchProducts();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar el producto.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddInsumo = async (event) => { /* ... (Tu código original, sin cambios) ... */ };
  const handleIncrementInsumoQuantity = async (insumoId, currentQuantity) => { /* ... (Tu código original, sin cambios) ... */ };
  const handleDecrementInsumoQuantity = async (insumoId, currentQuantity) => { /* ... (Tu código original, sin cambios) ... */ };
  const handleDeleteInsumo = async (insumoId, insumoName) => { /* ... (Tu código original, sin cambios) ... */ };
  const handleUpdateInsumo = async (event) => { /* ... (Tu código original, sin cambios) ... */ };
  const handleAddItemToTicket = (event) => { /* ... (Tu código original, sin cambios) ... */ };
  const handleFinalizeSale = async () => { /* ... (Tu código original, sin cambios) ... */ };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("welcomeToastShown");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Sesión cerrada.");
      navigate("/login"); // Usa navigate para redirigir
    } catch (error) {
      toast.error(error.message || "No se pudo cerrar la sesión.");
    }
  };

  const openEditModal = (item, type) => {
    setEditingItem({ ...item, itemType: type, newImageFile: null });
    setIsModalOpen(true);
  };

  const reportData = useMemo(() => { /* ... (Tu código original, sin cambios) ... */ }, [salesHistory, insumos, products, selectedDate]);

  return (
    <motion.div
      className={styles.dashboardContainer}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.5 }}
    >
      <header className={styles.header}>
        <h1 className={styles.title}>Gestión de Negocio</h1>
        <ProfileDropdown
          user={user}
          onLogout={handleLogout}
          onShowSettings={() => setCurrentView('settings')}
        />
      </header>

      {currentView === 'tabs' ? (
        <>
          <nav className={styles.tabs}>
            <button className={`${styles.tabButton} ${activeTab === "ventas" ? styles.activeTab : ""}`} onClick={() => setActiveTab("ventas")}>Ventas</button>
            <button className={`${styles.tabButton} ${activeTab === "products" ? styles.activeTab : ""}`} onClick={() => setActiveTab("products")}>Mis Productos</button>
            <button className={`${styles.tabButton} ${activeTab === "insumos" ? styles.activeTab : ""}`} onClick={() => setActiveTab("insumos")}>Insumos</button>
            <button className={`${styles.tabButton} ${activeTab === "reportes" ? styles.activeTab : ""}`} onClick={() => setActiveTab("reportes")}>Reportes</button>
          </nav>
          <main className={styles.tabContent}>
            {activeTab === "ventas" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <section className={styles.card}>
                  <h2>Crear Ticket de Venta</h2>
                  <form onSubmit={handleAddItemToTicket} className={styles.salesFormGrid}>
                    <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className={styles.input}>
                      <option value="" disabled>-- Selecciona un producto --</option>
                      {products.map((product) => (<option key={product.id} value={product.id}>{product.name}</option>))}
                    </select>
                    <input type="number" placeholder="Cantidad" className={styles.input} value={saleQuantity} onChange={(e) => setSaleQuantity(Number(e.target.value))} min="1" />
                    <button type="submit" className={styles.button}>Agregar al Ticket</button>
                  </form>
                </section>
                <section className={styles.card}>
                  <h2>Ticket Actual</h2>
                  <ul className={styles.ticketList}>
                    {currentTicket.length === 0 ? (<p>Añade productos para empezar un nuevo ticket.</p>) : (
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
                    <div className={styles.productTypeSelector}>
                      <label><input type="radio" value="direct" checked={newProduct.type === "direct"} onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value, recipe: [] })}/>Reventa (Usa 1 Insumo)</label>
                      <label><input type="radio" value="recipe" checked={newProduct.type === "recipe"} onChange={(e) => setNewProduct({ ...newProduct, type: e.target.value, insumoId: "" })}/>Producido (Usa Receta)</label>
                    </div>
                    {newProduct.type === "direct" ? (
                      <select value={newProduct.insumoId} onChange={(e) => { const selectedInsumo = insumos.find((i) => i.id === Number(e.target.value)); setNewProduct({ ...newProduct, insumoId: e.target.value, name: selectedInsumo ? selectedInsumo.name : "" }); }} className={styles.input}>
                        <option value="" disabled>-- Selecciona un Insumo para Vender --</option>
                        {insumos.map((insumo) => (<option key={insumo.id} value={insumo.id}>{insumo.name}</option>))}
                      </select>
                    ) : (
                      <input type="text" placeholder="Nombre del Producto con Receta" className={styles.input} value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}/>
                    )}
                    <input type="number" placeholder="Precio de Venta ($)" className={styles.input} value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} min="0" />
                    <div className={styles.inputGroup}>
                      <label htmlFor="productImage">Imagen del Producto (Opcional)</label>
                      <input id="productImage" type="file" accept="image/png, image/jpeg" onChange={(e) => setNewProduct({ ...newProduct, imageFile: e.target.files[0] })} className={styles.input} />
                    </div>
                    {newProduct.type === "recipe" && (
                      <>
                        <h3 className={styles.recipeTitle}>Definir Receta</h3>
                        <div className={styles.recipeFormGrid}>
                          <select value={selectedInsumoIdForRecipe} onChange={(e) => setSelectedInsumoIdForRecipe(e.target.value)} className={styles.input}>
                            <option value="" disabled>-- Selecciona Insumo --</option>
                            {insumos.map((insumo) => (<option key={insumo.id} value={insumo.id}>{insumo.name} ({insumo.usageUnit})</option>))}
                          </select>
                          <input type="number" placeholder="Cantidad usada" className={styles.input} value={recipeQuantity} onChange={(e) => setRecipeQuantity(e.target.value)} min="0" />
                          <button type="button" onClick={handleAddRecipeItem} className={styles.addRecipeButton}>+</button>
                        </div>
                        <ul className={styles.recipeList}>
                          {newProduct.recipe.length === 0 ? (<li className={styles.recipeEmpty}>Aún no hay ingredientes.</li>) : (
                            newProduct.recipe.map((item, index) => (
                              <li key={index} className={styles.recipeItem}>
                                <span>{item.quantityUsed} {item.unit} de {item.name}</span>
                                <button type="button" onClick={() => handleRemoveRecipeItem(index)} className={styles.removeRecipeButton}>x</button>
                              </li>
                            ))
                          )}
                        </ul>
                      </>
                    )}
                    <button type="submit" className={styles.button} disabled={isUploading}>{isUploading ? "Guardando..." : "Guardar Producto"}</button>
                  </form>
                </section>
                <section className={styles.card}>
                  <h2>Mis Productos Vendibles</h2>
                  <div className={styles.productGrid}>
                    {products.length === 0 ? (<p>No has agregado productos.</p>) : (
                      products.map((product) => (
                        <div key={product.id} className={styles.productCard}>
                          {product.image_url ? (<img src={product.image_url} alt={product.name} className={styles.productImage}/>) : (<div className={styles.productImagePlaceholder}></div>)}
                          <div className={styles.productCardInfo}>
                            <h4 className={styles.productCardName}>{product.name}</h4>
                            <p className={styles.productCardPrice}>${product.price?.toFixed(2)}</p>
                          </div>
                          <div className={styles.productCardActions}>
                            <button className={styles.actionButton} onClick={() => openEditModal(product, "product")}>Editar</button>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <section className={styles.card}>
                  <h2>Agregar Nuevo Insumo</h2>
                  <form onSubmit={handleAddInsumo} className={styles.insumoFormGrid}>
                    <h3 className={styles.formSectionTitle}>1. ¿Qué compraste?</h3>
                    <input type="text" placeholder="Nombre del Insumo" className={styles.input} value={newInsumo.name} onChange={(e) => setNewInsumo({ ...newInsumo, name: e.target.value })}/>
                    <input type="number" placeholder="Cantidad Comprada" className={styles.input} value={newInsumo.purchaseQuantity} onChange={(e) => setNewInsumo({ ...newInsumo, purchaseQuantity: e.target.value })} min="0" />
                    <select className={styles.input} value={newInsumo.purchaseUnit} onChange={(e) => setNewInsumo({ ...newInsumo, purchaseUnit: e.target.value })}>
                      <option value="kg">Kilogramo (kg)</option>
                      <option value="lt">Litro (lt)</option>
                      <option value="pz">Paquete/Caja (pz)</option>
                    </select>
                    <input type="number" placeholder="Costo Total de la Compra ($)" className={styles.input} value={newInsumo.totalCost} onChange={(e) => setNewInsumo({ ...newInsumo, totalCost: e.target.value })} min="0" />
                    <h3 className={styles.formSectionTitle}>2. ¿Cómo lo usas en tus recetas?</h3>
                    <select className={styles.input} value={newInsumo.usageUnit} onChange={(e) => setNewInsumo({ ...newInsumo, usageUnit: e.target.value })}>
                      <option value="g">Gramo (g)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="pz">Pieza (pz)</option>
                    </select>
                    <input type="number" placeholder={`# de ${newInsumo.usageUnit} por cada ${newInsumo.purchaseUnit}`} className={styles.input} value={newInsumo.conversionRate} onChange={(e) => setNewInsumo({ ...newInsumo, conversionRate: e.target.value })} min="0" />
                    <input type="number" placeholder={`Alerta de stock (en ${newInsumo.usageUnit})`} className={styles.input} value={newInsumo.alertThreshold} onChange={(e) => setNewInsumo({ ...newInsumo, alertThreshold: e.target.value })} />
                    <button type="submit" className={styles.button}>Agregar Insumo</button>
                  </form>
                </section>
                <section className={styles.card}>
                  <h2>Inventario de Insumos</h2>
                  <div className={styles.filtersContainer}>
                    <input type="text" placeholder="Buscar insumo por nombre..." className={styles.input} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    <select value={filterByProductId} onChange={(e) => setFilterByProductId(e.target.value)} className={styles.input}>
                      <option value="">-- Filtrar por Receta de Producto --</option>
                      {products.filter((p) => p.type === "recipe").map((product) => (<option key={product.id} value={product.id}>{product.name}</option>))}
                    </select>
                  </div>
                  {(() => {
                    let filteredInsumos = [...insumos];
                    if (filterByProductId) {
                      const selectedProduct = products.find((p) => p.id === Number(filterByProductId));
                      if (selectedProduct && selectedProduct.recipe) {
                        const recipeInsumoIds = selectedProduct.recipe.map((item) => item.insumoId);
                        filteredInsumos = insumos.filter((insumo) => recipeInsumoIds.includes(insumo.id));
                      }
                    }
                    if (searchTerm) {
                      filteredInsumos = filteredInsumos.filter((insumo) => insumo.name.toLowerCase().includes(searchTerm.toLowerCase()));
                    }
                    return (
                      <ul className={styles.insumoList}>
                        {filteredInsumos.length === 0 ? (<p>No se encontraron insumos.</p>) : (
                          filteredInsumos.map((insumo) => (
                            <li key={insumo.id} className={`${styles.insumoItem} ${insumo.alertThreshold != null && insumo.stockInUsageUnit <= insumo.alertThreshold ? styles.lowStock : ""}`}>
                              <div className={styles.insumoInfo}>
                                <span className={styles.insumoName}><HighlightText text={insumo.name} highlight={searchTerm}/></span>
                                <span className={styles.insumoCost}>Costo: ${(insumo.costPerUsageUnit || 0).toFixed(2)} / {insumo.usageUnit}</span>
                              </div>
                              <div className={styles.insumoDetails}>
                                <div className={styles.actionButtons}>
                                  <button onClick={() => handleDecrementInsumoQuantity(insumo.id, insumo.stockInUsageUnit)}>-</button>
                                  <span className={styles.quantityText}>{insumo.stockInUsageUnit} <span className={styles.unitText}>{insumo.usageUnit}</span></span>
                                  <button onClick={() => handleIncrementInsumoQuantity(insumo.id, insumo.stockInUsageUnit)}>+</button>
                                </div>
                                <div className={styles.insumoActions}>
                                  <button className={styles.actionButton} onClick={() => openEditModal(insumo, "insumo")}>Editar</button>
                                  <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDeleteInsumo(insumo.id, insumo.name)}>Borrar</button>
                                </div>
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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                <div className={styles.filterControls}>
                  <label htmlFor="date-filter">Filtrar por fecha:</label>
                  <input type="date" id="date-filter" className={styles.input} value={selectedDate || ""} onChange={(e) => setSelectedDate(e.target.value)}/>
                  {selectedDate && (<button onClick={() => setSelectedDate(null)} className={styles.clearButton}>Ver Todas</button>)}
                </div>
                <section className={styles.card}>
                  <h2>Ingresos por Producto</h2>
                  <div className={styles.chartContainer}>
                    {reportData.chartLabels && reportData.chartLabels.length > 0 ? (
                      <SalesChart labels={reportData.chartLabels} dataValues={reportData.chartDataValues} />
                    ) : (
                      <p>No hay datos de ventas para mostrar en el gráfico.</p>
                    )}
                  </div>
                </section>
                <section className={styles.reportsGrid}>
                  <div className={styles.reportCard}><h4>Ingresos Totales</h4><p>${reportData.totalRevenue.toFixed(2)}</p></div>
                  <div className={`${styles.reportCard} ${styles.profitCard}`}><h4>Ganancia Neta</h4><p>${reportData.totalProfit.toFixed(2)}</p></div>
                  <div className={styles.reportCard}><h4>Ventas Realizadas</h4><p>{reportData.totalSalesCount}</p></div>
                  <div className={styles.reportCard}><h4>Producto Estrella</h4><p className={styles.smallText}>{reportData.mostProfitableProduct}</p></div>
                </section>
                <section className={`${styles.reportsGrid} ${styles.secondaryReports}`}>
                  <div className={styles.reportCard}><h4>Valor de Insumos (Costo)</h4><p>${reportData.inventoryValueByCost.toFixed(2)}</p></div>
                  <div className={styles.reportCard}><h4>Productos Definidos</h4><p>{products.length}</p></div>
                </section>
                <section className={styles.card}>
                  <h2>Historial Detallado de Ventas</h2>
                  <ul className={styles.ticketGroupList}>
                    {reportData.groupedSalesArray.length === 0 ? (<p>Aún no se han registrado ventas.</p>) : (
                      reportData.groupedSalesArray.map((ticket) => (
                        <li key={ticket.ticketId} className={styles.ticketGroup}>
                          <div className={styles.ticketHeader}>
                            <div className={styles.ticketDetails}>
                              <span className={styles.ticketDate}>{ticket.date}</span>
                              <span className={`${styles.paymentBadge} ${styles[ticket.paymentMethod]}`}>{ticket.paymentMethod}</span>
                            </div>
                            <div className={styles.ticketTotalLarge}>Total: <span>${ticket.total.toFixed(2)}</span></div>
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
          </main>
        </>
      ) : (
        <main className={styles.tabContent}>
          <button onClick={() => setCurrentView('tabs')} className={styles.backButton}>
            &larr; Volver al Dashboard
          </button>
          <h2>Configuración de Cuenta</h2>
          <p>Email: <strong>{user?.email}</strong></p>
          <PasswordSettingForm />
        </main>
      )}

      <AnimatePresence>
        {isModalOpen && editingItem && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}>
              {editingItem.itemType === "insumo" && (
                <form onSubmit={handleUpdateInsumo}>
                  <h2>Editar Insumo</h2>
                  <div className={styles.inputGroup}><label>Nombre del Insumo</label><input type="text" className={styles.input} value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}/></div>
                  <div className={styles.inputGroup}><label>Costo por Unidad de Uso ({editingItem.usageUnit})</label><input type="number" className={styles.input} value={editingItem.costPerUsageUnit} onChange={(e) => setEditingItem({ ...editingItem, costPerUsageUnit: e.target.value })} min="0" step="0.01" /></div>
                  <div className={styles.inputGroup}><label>Umbral de Alerta de Stock (en {editingItem.usageUnit})</label><input type="number" className={styles.input} value={editingItem.alertThreshold || ""} onChange={(e) => setEditingItem({ ...editingItem, alertThreshold: e.target.value })}/></div>
                  <div className={styles.modalActions}>
                    <button type="button" onClick={() => setIsModalOpen(false)} className={styles.buttonSecondary}>Cancelar</button>
                    <button type="submit" className={styles.button} disabled={isUploading}>Guardar Cambios</button>
                  </div>
                </form>
              )}
              {editingItem.itemType === "product" && (
                <form onSubmit={handleUpdateProduct}>
                  <h2>Editar Producto</h2>
                  {editingItem.image_url && (<img src={editingItem.image_url} alt="Vista previa" className={styles.modalImagePreview}/>)}
                  <div className={styles.inputGroup}><label>Cambiar Imagen (Opcional)</label><input type="file" accept="image/png, image/jpeg" className={styles.input} onChange={(e) => setEditingItem({ ...editingItem, newImageFile: e.target.files[0] })}/></div>
                  <div className={styles.inputGroup}><label>Nombre del Producto</label><input type="text" className={styles.input} value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} disabled={editingItem.type === "direct"}/></div>
                  <div className={styles.inputGroup}><label>Precio de Venta ($)</label><input type="number" className={styles.input} value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}/></div>
                  {editingItem.type === "recipe" && (
                    <>
                      <h3 className={styles.recipeTitle}>Editar Receta</h3>
                      <div className={styles.recipeFormGrid}>
                        <select value={selectedInsumoIdForRecipe} onChange={(e) => setSelectedInsumoIdForRecipe(e.target.value)} className={styles.input}>
                          <option value="" disabled>-- Añadir Insumo a la Receta --</option>
                          {insumos.map((insumo) => (<option key={insumo.id} value={insumo.id}>{insumo.name} ({insumo.usageUnit})</option>))}
                        </select>
                        <input type="number" placeholder="Cantidad" className={styles.input} value={recipeQuantity} onChange={(e) => setRecipeQuantity(e.target.value)} min="0" />
                        <button type="button" onClick={handleAddRecipeItemToEdit} className={styles.addRecipeButton}>+</button>
                      </div>
                      <ul className={styles.recipeList}>
                        {editingItem.recipe && editingItem.recipe.length > 0 ? (
                          editingItem.recipe.map((item, index) => (
                            <li key={index} className={styles.recipeItem}>
                              <span>{item.quantityUsed} {item.unit} de {item.name}</span>
                              <button type="button" onClick={() => handleRemoveRecipeItemFromEdit(index)} className={styles.removeRecipeButton}>x</button>
                            </li>
                          ))
                        ) : (<li className={styles.recipeEmpty}>Sin ingredientes.</li>)}
                      </ul>
                    </>
                  )}
                  <div className={styles.modalActions}>
                    <button type="button" onClick={() => setIsModalOpen(false)} className={styles.buttonSecondary}>Cancelar</button>
                    <button type="submit" className={styles.button} disabled={isUploading}>Guardar Cambios</button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DashboardPage;