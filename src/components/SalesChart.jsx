// src/components/SalesChart.jsx

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { generateColorFromString } from '../utils/colorUtils'; // <-- 1. IMPORTA LA FUNCIÓN

ChartJS.register(ArcElement, Tooltip, Legend);

function SalesChart({ labels, dataValues }) {
  // --- INICIO DEL CAMBIO ---
  // 2. Generamos los colores dinámicamente para cada etiqueta
  const backgroundColors = labels.map(label => generateColorFromString(label));
  const borderColors = backgroundColors.map(color => color.replace('0.7', '1')); // Hacemos el borde opaco

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Ingresos por Producto',
        data: dataValues,
        backgroundColor: backgroundColors, // 3. Usamos los colores generados
        borderColor: borderColors,         // 4. Usamos los colores de borde generados
        borderWidth: 1,
      },
    ],
  };
  // --- FIN DEL CAMBIO ---

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
            color: '#f9fafb',
        }
      },
      tooltip: {
        callbacks: {
            label: function(context) {
                let label = context.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed !== null) {
                    label += new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(context.parsed);
                }
                return label;
            }
        }
      }
    },
  };

  return <Doughnut data={data} options={options} />;
}

export default SalesChart;