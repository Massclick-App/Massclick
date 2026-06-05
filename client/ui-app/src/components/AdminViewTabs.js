import React from "react";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import { createScopedClassNames } from "../utils/createScopedClassNames";
import styles from "./AdminViewTabs.module.css";

const cx = createScopedClassNames(styles);

export default function AdminViewTabs({
  activeView,
  onChange,
  isEditing = false,
  createLabel = "Create",
  listLabel = "List",
  listCount,
}) {
  const tabs = [
    {
      value: "form",
      label: isEditing ? `Edit ${createLabel}` : createLabel,
      icon: isEditing ? EditRoundedIcon : AddCircleOutlineRoundedIcon,
    },
    {
      value: "list",
      label: listCount == null ? listLabel : `${listLabel} (${listCount})`,
      icon: TableRowsRoundedIcon,
    },
  ];

  return (
    <div className={cx("admin-view-tabs")} role="tablist" aria-label="Admin page sections">
      {tabs.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={activeView === value}
          className={cx("admin-view-tab", activeView === value && "active")}
          onClick={() => onChange(value)}
        >
          <Icon fontSize="small" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
