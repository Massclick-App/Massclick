import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect } from "react";
import { Alert, Button, Skeleton } from "@mui/material";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import StoreIcon from "@mui/icons-material/Store";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import { useDispatch, useSelector } from "react-redux";
import { getDashboardSummary } from "state/actions/businessListAction.js";
import styles from "shared/components/business-card/businessCard.module.css";

const cx = createScopedClassNames(styles);

export default function SelectActionCard({
  activeFilter = "all",
  compact = false,
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
    return <div className={cx("card-grid", compact ? "card-grid--compact" : "")} aria-label="Loading business overview">
      {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="rounded" height={compact ? 96 : 144} />)}
    </div>;
  }

  if (dashboardSummaryError) {
    return <Alert severity="error" action={<Button onClick={() => dispatch(getDashboardSummary())}>Retry</Button>}>
      Unable to load the business overview. Please try again.
    </Alert>;
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
    title: "Added today",
    value: todayCount,
    icon: <BusinessCenterIcon />,
    color: "#ff7043",
    filter: { type: "today", label: "Added today" }
  }, {
    id: "all",
    title: "All businesses",
    value: totalCount,
    icon: <StoreIcon />,
    color: "#42a5f5",
    filter: { type: "all", label: "Total Businesses" }
  }, {
    id: "active",
    title: "Active businesses",
    value: activeCount,
    icon: <ShoppingCartIcon />,
    color: "#66bb6a",
    filter: { type: "active", label: "Active Businesses" }
  }, {
    id: "hotCategory",
    title: <span className={cx("hot-ribbon")}>Top category</span>,
    value: hotCategory,
    icon: <WhatshotIcon />,
    color: "#ff3d00",
    filter: { type: "category", label: `Category: ${hotCategory}`, value: hotCategory }
  }, {
    id: "inactive",
    title: "Inactive businesses",
    value: inactiveCount,
    icon: <ShoppingCartIcon />,
    color: "#d32f2f",
    filter: { type: "inactive", label: "Inactive Businesses" }
  }];

  const orderedCards = compact
    ? ["all", "active", "inactive", "today", "hotCategory"].map(id => cards.find(card => card.id === id))
    : cards;

  return <div className={cx("card-grid", compact ? "card-grid--compact" : "")}>
    {orderedCards.map(card => (
      <button
        type="button"
        className={cx("stat-card", activeFilter === card.filter.type ? "stat-card--active" : "")}
        key={card.id}
        aria-pressed={activeFilter === card.filter.type}
        onClick={() => onCardClick?.(card.filter)}
      >
        <div className={cx("card-icon")} style={{ backgroundColor: card.color }}>
          {card.icon}
        </div>

        <div>
          <h4 className={cx("card-title")}>{card.title}</h4>

          <h2 className={cx("card-value", card.id === "hotCategory" ? "hot-category-text" : "")}>
            {typeof card.value === "number" ? card.value.toLocaleString("en-IN") : card.value}
          </h2>
        </div>
      </button>
    ))}
  </div>;
}
