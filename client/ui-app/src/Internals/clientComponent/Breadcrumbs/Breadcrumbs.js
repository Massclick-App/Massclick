import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React from "react";
import { Link } from "react-router-dom";
import styles from "./Breadcrumbs.module.css";
const cx = createScopedClassNames(styles);
const toPascalCase = str => {
  if (!str) return "";
  return str.split(/[\s-]+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
};
const Breadcrumbs = ({
  items = []
}) => {
  if (items.length === 0) return null;
  return <nav className={cx("breadcrumbs")} aria-label="Breadcrumb">
      <div className={cx("breadcrumbs-container")}>
        {items.map((item, index) => <div key={index} className={cx("breadcrumb-item")}>
            {item.link ? <Link to={item.link} onClick={item.onClick} className={cx("breadcrumb-link")}>
                {toPascalCase(item.label)}
              </Link> : item.onClick ? <button onClick={item.onClick} className={cx("breadcrumb-link breadcrumb-button")}>
                {toPascalCase(item.label)}
              </button> : <span className={cx("breadcrumb-text")}>{toPascalCase(item.label)}</span>}
            {index < items.length - 1 && <span className={cx("breadcrumb-separator")}>›</span>}
          </div>)}
      </div>
    </nav>;
};
export default Breadcrumbs;
