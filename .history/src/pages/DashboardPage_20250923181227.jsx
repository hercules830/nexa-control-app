import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import styles from "./DashboardPage.module.css";
import toast from "react-hot-toast";
import HighlightText from "../components/HighlightText.jsx";
import SalesChart from "../components/SalesChart.jsx";
import ProfileDropdown from '../components/ProfileDropdown.jsx';
import PasswordSettingForm from '../components/PasswordSettingForm.jsx';

function DashboardPage({ user, subscriptionStatus, refreshProfile }) {
  // --- ESTADOS ---
  const [products, setProducts] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", type: "direct", insumoId: "", recipe: [], imageFile: null });
  const [selectedInsumoIdForRecipe, setSelectedInsumoIdForRecipe] = useState("");
  const [recipeQuantity, setRecipeQuantity] = useState("");
  const [newInsumo, setNewInsumo] = useState({ name: "", purchaseQuantity: "", purchaseUnit: "kg", totalCost: "", usageUnit: "g", conversionRate: "", alertThreshold: "" });
  const [selectedProductId, setSelectedProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState(1);
  const [currentTicket, setCurrentTicket] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [activeTab, setActiveTab] = useState("ventas");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // <--- CAMBIO DE currentView a isSettingsOpen
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterByProductId, setFilterByProductId] = useState("");
  const navigate = useNavigate();
  const [reponerInsumoId, setReponerInsumoId] = useState('');
  const [reponerCantidad, setReponerCantidad] = useState('');
  const [reponerCostoTotal, setReponerCostoTotal] = useState('');

  const fetchProducts = async () => {
    const { data, error } = await supabase.from("products").select("*");
    if (error) { console.error("Error cargando productos:", error); toast.error("Error al cargar productos."); } 
    else { setProducts(data || []); }
  };

  const fetchInsumos = async () => {
    const { data, error } = await supabase.from("insumos").select("*");
    if (error) { console.error("Error cargando insumos:", error); toast.error("Error al cargar insumos."); } 
    else { setInsumos(data || []); }
  };

  const fetchSales = async () => {
    const { data, error } = await supabase.from("sales").select("*").order("ticket_id", { ascending: false });
    if (error) { console.error("Error cargando ventas:", error); toast.error("Error al cargar ventas."); } 
    else { setSalesHistory(data || []); }
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
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleAddProduct = async (event) => { /* Tu código original sin cambios */ };
  const handleAddRecipeItem = () => { /* Tu código original sin cambios */ };
  const handleRemoveRecipeItem = (index) => { /* Tu código original sin cambios */ };
  const handleDeleteProduct = async (productId, productName) => { /* Tu código original sin cambios */ };
  const handleAddRecipeItemToEdit = () => { /* Tu código original sin cambios */ };
  const handleRemoveRecipeItemFromEdit = (index) => { /* Tu código original sin cambios */ };
  const handleUpdateProduct = async (event) => { /* Tu código original sin cambios */ };
  const handleAddInsumo = async (event) => { /* Tu código original sin cambios */ };
  const handleReponerStock = async (e) => { /* Tu código original sin cambios */ };
  const handleIncrementInsumoQuantity = async (insumoId, currentQuantity) => { /* Tu código original sin cambios */ };
  const handleDecrementInsumoQuantity = async (insumoId, currentQuantity) => { /* Tu código original sin cambios */ };
  const handleDeleteInsumo = async (insumoId, insumoName) => { /* Tu código original sin cambios */ };
  const handleUpdateInsumo = async (event) => { /* Tu código original sin cambios */ };
  const handleAddItemToTicket = (event) => { /* Tu código original sin cambios */ };
  const handleFinalizeSale = async () => { /* Tu código original sin cambios */ };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("welcomeToastShown");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Sesión cerrada.");
      navigate("/login");
    } catch (error) {
      toast.error(error.message || "No se pudo cerrar la sesión.");
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("¿Seguro que quieres cancelar tu suscripción? Podrás seguir usando el servicio hasta el final de tu período actual.")) {
      return;
    }
    setIsCanceling(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-subscription');
      if (error) throw error;
      toast.success("Tu suscripción ha sido programada para cancelación.");
      if (refreshProfile) {
        refreshProfile();
      }
    } catch (error) {
      toast.error(error.message || "No se pudo cancelar la suscripción.");
    } finally {
      setIsCanceling(false);
    }
  };

  const openEditModal = (item, type) => {
    setEditingItem({ ...item, itemType: type, newImageFile: null });
    setIsModalOpen(true);
  };
  
  const reportData = useMemo(() => { /* Tu código original sin cambios */ }, [salesHistory, insumos, products, selectedDate]);

  return (
    <div className={styles.dashboardContainer}>
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className={styles.mainContent}>
        <header className={styles.header}>
          <h1 className={styles.title}>Gestión de Negocio</h1>
          <ProfileDropdown
            user={user}
            onLogout={handleLogout}
            onShowSettings={() => setIsSettingsOpen(true)}
          />
        </header>
        <nav className={styles.tabs}>
          <button className={`${styles.tabButton} ${activeTab === "ventas" ? styles.activeTab : ""}`} onClick={() => setActiveTab("ventas")}>Ventas</button>
          <button className={`${styles.tabButton} ${activeTab === "products" ? styles.activeTab : ""}`} onClick={() => setActiveTab("products")}>Mis Productos</button>
          <button className={`${styles.tabButton} ${activeTab === "insumos" ? styles.activeTab : ""}`} onClick={() => setActiveTab("insumos")}>Insumos</button>
          <button className={`${styles.tabButton} ${activeTab === "reportes" ? styles.activeTab : ""}`} onClick={() => setActiveTab("reportes")}>Reportes</button>
        </nav>
        <main className={styles.tabContent}>
          {activeTab === "ventas" && ( <motion.div>...</motion.div> )}
          {activeTab === "products" && ( <motion.div>...</motion.div> )}
          {activeTab === "insumos" && ( <motion.div>...</motion.div> )}
          {activeTab === "reportes" && ( <motion.div>...</motion.div> )}
        </main>
      </div>

      <AnimatePresence>
        {isSettingsOpen && (
          <motion.aside
            className={styles.settingsSidebar}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className={styles.sidebarHeader}>
              <h2>Configuración de Cuenta</h2>
              <button onClick={() => setIsSettingsOpen(false)} className={styles.closeButton}>&times;</button>
            </div>
            <div className={styles.sidebarContent}>
              <p>Email: <strong>{user?.email}</strong></p>
              <PasswordSettingForm />
              <div className={styles.subscriptionSection}>
                <h4>Gestionar Suscripción</h4>
                {(subscriptionStatus === 'active' || subscriptionStatus === 'trialing') && (
                  <>
                    <p>Tu plan está actualmente activo.</p>
                    <button 
                      onClick={handleCancelSubscription} 
                      className={styles.cancelButton}
                      disabled={isCanceling}
                    >
                      {isCanceling ? "Cancelando..." : "Cancelar Suscripción al Final del Período"}
                    </button>
                  </>
                )}
                {subscriptionStatus === 'canceled' && (
                  <p>Tu suscripción ya está programada para cancelarse.</p>
                )}
                {!(subscriptionStatus === 'active' || subscriptionStatus === 'trialing' || subscriptionStatus === 'canceled') && (
                  <p>No tienes una suscripción activa. <a href="/pricing">Ver planes</a></p>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && editingItem && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={styles.modalContent} initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }}>
              {editingItem.itemType === "insumo" && (
                <form onSubmit={handleUpdateInsumo}>
                  <h2>Editar Insumo</h2>
                  <div className={styles.inputGroup}><label>Nombre del Insumo</label><input type="text" className={styles.input} value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}/></div>
                  <div className={styles.inputGroup}><label>Costo por Unidad de Uso ({editingItem.usage_unit})</label><input type="number" className={styles.input} value={editingItem.cost_per_usage_unit} onChange={(e) => setEditingItem({ ...editingItem, cost_per_usage_unit: e.target.value })} min="0" step="0.01" /></div>
                  <div className={styles.inputGroup}><label>Umbral de Alerta de Stock (en {editingItem.usage_unit})</label><input type="number" className={styles.input} value={editingItem.alert_threshold || ""} onChange={(e) => setEditingItem({ ...editingItem, alert_threshold: e.target.value })}/></div>
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
                          {insumos.map((insumo) => (<option key={insumo.id} value={insumo.id}>{insumo.name} ({insumo.usage_unit})</option>))}
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
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardPage;