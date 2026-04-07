import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

import './mrpCategoryChart.css';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function MRPCategoryChart({ data = [] }) {

  const categoryMap = data.reduce((acc, item) => {
    if (!item?.categoryId) return acc;
    acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(categoryMap);   
  const values = Object.values(categoryMap); 

  if (!labels.length) {
    return <p style={{ color: '#64748b' }}>No data available</p>;
  }

  const chartData = {
    labels, 
    datasets: [
      {
        data: values,
        backgroundColor: [
          '#ff8a00',
          '#6366f1',
          '#22c55e',
          '#ec4899',
          '#14b8a6',
          '#f97316',
          '#0ea5e9',
          '#a855f7'
        ],
        borderWidth: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false 
      },
      tooltip: {
        enabled: true,
        callbacks: {
          title: function (context) {
            return context[0].label;
          },
          label: function (context) {
            return `Count: ${context.raw}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height: 260 }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
