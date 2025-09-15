// src/utils/colorUtils.js

/**
 * Genera un color HSL único y consistente basado en un string.
 * @param {string} str - El string de entrada (ej. nombre del producto).
 * @returns {string} - Un color en formato 'hsl(hue, saturation, lightness)'.
 */
export const generateColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    // Usamos valores fijos de saturación y luminosidad para colores pastel consistentes
    const saturation = 70;
    const lightness = 60;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };