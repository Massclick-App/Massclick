import React from "react";
import { getTimeParts, to24HourTime } from "shared/utils/businessHours.js";

export default function Time12HourInput({ value, onChange, disabled, label, className }) {
  const parts = getTimeParts(value);
  const period = parts?.period || "AM";

  const togglePeriod = () => {
    if (parts) onChange(to24HourTime({ ...parts, period: period === "AM" ? "PM" : "AM" }));
  };

  return (
    <div role="group" aria-label={label} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <input
        type="time"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        aria-label={label}
        className={className}
        style={{ flex: 1, minWidth: 0 }}
      />
      <button
        type="button"
        onClick={togglePeriod}
        disabled={disabled || !parts}
        aria-label={`${label}: ${period}. Switch to ${period === "AM" ? "PM" : "AM"}`}
        title="Switch AM/PM"
        style={{
          height: 40,
          padding: "0 10px",
          border: "1px solid var(--color-border, #d9d9d9)",
          borderRadius: 8,
          background: "#ffffff",
          color: "inherit",
          font: "inherit",
          fontWeight: 600,
          cursor: disabled || !parts ? "default" : "pointer",
          opacity: disabled || !parts ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {period}
      </button>
    </div>
  );
}
