export const getTimeParts = (value) => {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value || "").trim());
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  const hours = Number(match[1]);
  return { hour: String(hours % 12 || 12), minute: match[2], period: hours >= 12 ? "PM" : "AM" };
};

export const to24HourTime = ({ hour, minute, period }) =>
  hour ? `${String(Number(hour) % 12 + (period === "PM" ? 12 : 0)).padStart(2, "0")}:${minute}` : "";

export const formatBusinessTime = (value) => {
  const parts = getTimeParts(value);
  return parts ? `${parts.hour}:${parts.minute} ${parts.period}` : String(value || "");
};

export const formatBusinessHours = (hours) => {
  if (hours?.isClosed) return "Closed";
  if (hours?.is24Hours) return "Open 24 hours";
  if (!hours?.open || !hours?.close) return "Open hours not available";
  return `${formatBusinessTime(hours.open)} - ${formatBusinessTime(hours.close)}`;
};
