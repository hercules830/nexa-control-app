// src/pages/DashboardPage.jsx
import { useState } from "react";

function DashboardPage() {
  // Estado para la lista de productos. El valor inicial es un array vacío.
  const [products, setProducts] = useState([]);

  // Estados para controlar los campos del formulario de "nuevo producto".
  const [productName, setProductName] = useState("");
  const [productQuantity, setProductQuantity] = useState("");

  // Función para manejar el envío del formulario.
  const handleAddProduct = (event) => {
    event.preventDefault(); // Evitamos que la página se recargue.

    // Validación simple: no agregar si el nombre está vacío o la cantidad no es un número válido.
    if (
      productName.trim() === "" ||
      isNaN(productQuantity) ||
      Number(productQuantity) <= 0
    ) {
      alert("Por favor, ingresa un nombre y una cantidad válida.");
      return;
    }

    // Creamos el objeto del nuevo producto.
    const newProduct = {
      id: Date.now(), // Usamos la fecha actual como un ID simple y único.
      name: productName,
      quantity: Number(productQuantity), // Nos aseguramos de que la cantidad sea un número.
    };

    // Actualizamos el estado de la lista de productos.
    // OJO: NUNCA modificamos el estado directamente (ej. products.push(newProduct)).
    // En su lugar, creamos un nuevo array con los productos antiguos (...products) más el nuevo.
    setProducts([...products, newProduct]);

    // Limpiamos los campos del formulario para que el usuario pueda agregar otro producto.
    setProductName("");
    setProductQuantity("");
  };


  // Función para incrementar la cantidad de un producto.
  const handleIncrementQuantity = (productId) => {
    // Usamos setProducts para actualizar el estado.
    setProducts(currentProducts =>
      // Creamos un NUEVO array usando .map()
      currentProducts.map(product => {
        // Si el id del producto coincide con el que queremos modificar...
        if (product.id === productId) {
          // ...devolvemos un NUEVO objeto con la cantidad actualizada.
          return { ...product, quantity: product.quantity + 1 };
        }
        // Si no coincide, devolvemos el producto sin cambios.
        return product;
      })
    );
  };



  // Función para decrementar la cantidad de un producto.
  const handleDecrementQuantity = (productId) => {
    setProducts(currentProducts =>
      currentProducts.map(product => {
        // Comprobamos que el ID coincida Y que la cantidad sea mayor a 1 para no tener negativos.
        if (product.id === productId && product.quantity > 1) {
          // Devolvemos el nuevo objeto con la cantidad actualizada.
          return { ...product, quantity: product.quantity - 1 };
        }
        // Si no, devolvemos el producto sin cambios.
        return product;
      })
    );
  };



  return (
    <div>
      <h1>Gestión de Inventario</h1>

      {/* Formulario para agregar nuevos productos */}
      <section>
        <h2>Agregar Nuevo Producto</h2>
        <form onSubmit={handleAddProduct}>
          <input
            type="text"
            placeholder="Nombre del producto"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Cantidad inicial"
            value={productQuantity}
            onChange={(e) => setProductQuantity(e.target.value)}
          />
          <button type="submit">Agregar al Inventario</button>
        </form>
      </section>

      {/* Lista de productos en el inventario */}
      <section>
        <h2>Mi Inventario</h2>
        <ul>
          {/* Usamos .map() para "traducir" cada objeto del array 'products' a un elemento <li> */}
          {products.map((product) => (
            // La 'key' es un prop especial que React necesita para identificar cada elemento en una lista.
            <li key={product.id}>
              <span>
                {product.name} - Cantidad: <strong>{product.quantity}</strong>
              </span>

                <div>
                  {/* 1. Botón para decrementar la cantidad */}
                <button onClick={() => handleDecrementQuantity(product.id)}>-</button>
                
                {/* 2. Botón para incrementar la cantidad */}
                <button onClick={() => handleIncrementQuantity(product.id)}>+</button>
                </div>

            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default DashboardPage;
