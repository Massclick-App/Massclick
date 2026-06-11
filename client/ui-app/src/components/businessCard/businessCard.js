import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect } from "react";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import StoreIcon from "@mui/icons-material/Store";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { useDispatch, useSelector } from "react-redux";
import { getDashboardSummary } from "../../redux/actions/businessListAction";
import styles from "./businessCard.module.css";

const cx = createScopedClassNames(styles);

export default function SelectActionCard({
  activeFilter = "all",
  onCardClick
}) {
  const dispatch = useDispatch();
  const {
    dashboardSummary,
    dashboardSummaryLoading,
    dashboardSummaryError
  } = useSelector(state => state.businessListReducer);

  useEffect(() => {
    dispatch(getDashboardSummary());
  }, [dispatch]);

  if (dashboardSummaryLoading) {
    return <p style={{ textAlign: "center" }}>Loading Dashboard...</p>;
  }

  if (dashboardSummaryError) {
    return <p style={{ textAlign: "center", color: "red" }}>
      Error: {dashboardSummaryError}
    </p>;
  }

  if (!dashboardSummary) {
    return <p style={{ textAlign: "center" }}>No Dashboard Data Found</p>;
  }

  const {
    todayCount = 0,
    totalCount = 0,
    activeCount = 0,
    inactiveCount = 0,
    hotCategory = "No Category"
  } = dashboardSummary;

  const cards = [{
    id: "today",
    title: "Today's Business",
    value: todayCount,
    icon: <BusinessCenterIcon />,
    color: "#ff7043",
    filter: { type: "today", label: "Today's Business" }
  }, {
    id: "all",
    title: "Total Businesses",
    value: totalCount,
    icon: <StoreIcon />,
    color: "#42a5f5",
    filter: { type: "all", label: "Total Businesses" }
  }, {
    id: "active",
    title: "Active Businesses",
    value: activeCount,
    icon: <ShoppingCartIcon />,
    color: "#66bb6a",
    filter: { type: "active", label: "Active Businesses" }
  }, {
    id: "hotCategory",
    title: <div className={cx("hot-ribbon")}>HOT CATEGORY</div>,
    value: hotCategory,
    icon: <WhatshotIcon />,
    color: "#ff3d00",
    filter: { type: "category", label: `Category: ${hotCategory}`, value: hotCategory }
  }, {
    id: "inactive",
    title: "Inactive Businesses",
    value: inactiveCount,
    icon: <ShoppingCartIcon />,
    color: "#d32f2f",
    filter: { type: "inactive", label: "Inactive Businesses" }
  }];

  return <div className={cx("card-grid")}>
    {cards.map(card => (
      <button
        type="button"
        className={cx("stat-card", activeFilter === card.filter.type ? "stat-card--active" : "")}
        key={card.id}
        onClick={() => onCardClick?.(card.filter)}
      >
        <h4 className={cx("card-title")}>{card.title}</h4>

        <h2 className={cx("card-value", card.id === "hotCategory" ? "hot-category-text" : "")}>
          {card.value}
        </h2>

        <div className={cx("card-icon")} style={{ backgroundColor: card.color }}>
          {card.icon}
        </div>
      </button>
    ))}
  </div>;
}
