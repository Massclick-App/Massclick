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
export default function SelectActionCard() {
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
    return <p style={{
      textAlign: "center"
    }}>Loading Dashboard...</p>;
  }
  if (dashboardSummaryError) {
    return <p style={{
      textAlign: "center",
      color: "red"
    }}>
                Error: {dashboardSummaryError}
            </p>;
  }
  if (!dashboardSummary) {
    return <p style={{
      textAlign: "center"
    }}>No Dashboard Data Found</p>;
  }
  const {
    todayCount = 0,
    totalCount = 0,
    activeCount = 0,
    inactiveCount = 0,
    hotCategory = "No Category"
  } = dashboardSummary;
  const cards = [{
    id: 1,
    title: "Today's Business",
    value: todayCount,
    icon: <BusinessCenterIcon />,
    color: "#ff7043"
  }, {
    id: 2,
    title: "Total Businesses",
    value: totalCount,
    icon: <StoreIcon />,
    color: "#42a5f5"
  }, {
    id: 3,
    title: "Active Businesses",
    value: activeCount,
    icon: <ShoppingCartIcon />,
    color: "#66bb6a"
  }, {
    id: 4,
    title: <div className={cx("hot-ribbon")}>
                    🔥 HOT CATEGORY
                </div>,
    value: hotCategory,
    icon: <WhatshotIcon />,
    color: "#ff3d00"
  }, {
    id: 5,
    title: "Inactive Businesses",
    value: inactiveCount,
    icon: <ShoppingCartIcon />,
    color: "#d32f2f"
  }];
  return <div className={cx("card-grid")}>
            {cards.map(card => <div className={cx("stat-card")} key={card.id}>

                    <h4 className={cx("card-title")}>{card.title}</h4>

                    <h2 className={cx(`card-value ${card.id === 4 ? "hot-category-text" : ""}`)}>
                        {card.value}
                    </h2>

                    <div className={cx("card-icon")} style={{
        backgroundColor: card.color
      }}>
                        {card.icon}
                    </div>
                </div>)}
        </div>;
}
