// src/components/HighlightText.jsx

function HighlightText({ text, highlight }) {
    // Si no hay texto de búsqueda, simplemente devolvemos el texto original.
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
  
    // Creamos una expresión regular para encontrar el texto de búsqueda, ignorando mayúsculas/minúsculas.
    const regex = new RegExp(`(${highlight})`, 'gi');
    // Dividimos el texto en partes: las que coinciden y las que no.
    const parts = text.split(regex);
  
    return (
      <span>
        {parts.map((part, index) =>
          // Si la parte coincide con nuestra búsqueda (ignorando mayúsculas/minúsculas)...
          regex.test(part) ? (
            // ...la envolvemos en una etiqueta <mark> para resaltarla.
            <mark key={index}>{part}</mark>
          ) : (
            // Si no, simplemente la mostramos como texto normal.
            <span key={index}>{part}</span>
          )
        )}
      </span>
    );
  }
  
  export default HighlightText;