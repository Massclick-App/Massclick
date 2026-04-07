export default function MRPChartKPI({ data = [] }) {
  if (!data.length) return null;

  const total = data.length;

  const uniqueCategoryCount = new Set(
    data.map(item => item?.categoryId).filter(Boolean)
  ).size;

  return (
    <div className="mrp-chart-kpi">
      <div>
        <span>Total</span>
        <strong>{total}</strong>
      </div>

      <div>
        <span>Categories</span>
        <strong>{uniqueCategoryCount}</strong>
      </div>

      <div>
        <span>Status</span>
        <strong>Active</strong>
      </div>
    </div>
  );
}
