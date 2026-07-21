import React, { useEffect, useRef } from "react";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./QuickLinksMenu.module.css";

const cx = createScopedClassNames(styles);

const QuickLinksMenu = ({ items, onClose, onSelect, triggerRef }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    const firstItem = menuRef.current?.querySelector("button");
    firstItem?.focus();

    const handlePointerDown = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        triggerRef.current?.contains(event.target)
      ) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [onClose, triggerRef]);

  return (
    <div
      ref={menuRef}
      id="quick-links-menu"
      className={cx("quick-links-menu")}
      role="menu"
      aria-label="Quick links"
    >
      {items.map((item) => (
        <button
          type="button"
          className={cx("quick-links-item")}
          role="menuitem"
          key={item.name}
          onClick={() => onSelect(item.name)}
        >
          <span className={cx("quick-links-icon")} aria-hidden="true">
            {item.icon}
          </span>
          <span className={cx("quick-links-label")}>{item.name}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickLinksMenu;
