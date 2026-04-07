import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector
} from "recharts";

import { getDashboardCharts } from "../../redux/actions/businessListAction";
import "./homeChart.css";

const chartColors = [
  "#28a745",
  "#007bff",
  "#ff9800",
  "#9c27b0",
  "#e91e63",
  "#00bcd4",
  "#14b8a6",
  "#8b5cf6"
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const d = payload[0];
    return (
      <div className="tooltip-box">
        <h4>{label}</h4>
        <p>
          <strong>{d.name}:</strong> {d.value}
        </p>
      </div>
    );
  }
  return null;
};

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export default function DashboardCharts() {
  const dispatch = useDispatch();

  const { chartData, chartLoading } = useSelector(
    (state) => state.businessListReducer
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    dispatch(getDashboardCharts());
  }, [dispatch]);

  if (chartLoading || !chartData)
    return <p style={{ textAlign: "center" }}>Loading chart...</p>;

  
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"
  ];

  const chart1Data = months.map((name, index) => {
    const found = chartData.monthly.find(
      (x) => x._id.month === index + 1
    );
    return { name, count: found?.count || 0 };
  });

  const max1 = Math.max(...chart1Data.map((d) => d.count), 0);
  const yMax1 = Math.ceil(max1 / 5) * 5 || 5;

  const bestMonthObj =
    chart1Data.reduce(
      (best, cur) => (cur.count > best.count ? cur : best),
      chart1Data[0]
    ) || { name: "-", count: 0 };

  const totalThisYear = chart1Data.reduce((sum, d) => sum + d.count, 0);
  const avgPerMonth = Math.round(totalThisYear / chart1Data.length);

  
  const chart2Data = chartData.categories.map((c) => ({
    category: c._id || "Unknown",
    count: c.count
  }));

  const totalCategories = chart2Data.reduce((s, d) => s + d.count, 0);

  const topCategories = [...chart2Data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="dashboard-container">

      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h2>Monthly New Business Trend</h2>
            <p>Year-to-date performance</p>
          </div>
        </div>

        <div className="metric-strip">
          <div className="metric-box">
            <span className="metric-label">Total this year</span>
            <span className="metric-value">{totalThisYear}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Best month</span>
            <span className="metric-value">
              {bestMonthObj.name} ({bestMonthObj.count})
            </span>
          </div>
          <div className="metric-box">
            <span className="metric-label">Avg / month</span>
            <span className="metric-value">{avgPerMonth}</span>
          </div>
        </div>

        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chart1Data}>
              <defs>
                <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, yMax1]} />
              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="count"
                stroke={chartColors[0]}
                fill="url(#areaColor)"
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <h2>Business Distribution by Category</h2>
          <p>Category-wise segmentation</p>
        </div>

        <div className="chart-wrapper donut-wrapper">
          <div className="donut-center">
            <strong>{totalCategories}</strong>
            <span>Total businesses</span>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={chart2Data}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {chart2Data.map((_, i) => (
                  <Cell key={i} fill={chartColors[i % chartColors.length]} />
                ))}
              </Pie>

              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="donut-breakdown">
            {topCategories.map((item, idx) => {
              const pct = ((item.count / totalCategories) * 100).toFixed(1);

              return (
                <div className="breakdown-row" key={idx}>
                  <div className="breakdown-title">
                    <span
                      className="legend-dot"
                      style={{ background: chartColors[idx % chartColors.length] }}
                    />
                    {item.category}
                  </div>

                  <div className="breakdown-meta">
                    <span>{item.count}</span>
                    <span>{pct}%</span>
                  </div>

                  <div className="breakdown-bar-track">
                    <div
                      className="breakdown-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: chartColors[idx % chartColors.length]
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
