import styles from "./dynamicTooltip.module.css";

export default function DynamicTooltip({ text, position = "top", children, className = "" }) {
  return <span className={`${styles.wrapper} ${className}`} data-position={position}>{children}<span className={styles.tooltip} role="tooltip">{text}</span></span>;
}
