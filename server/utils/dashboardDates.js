export const DASHBOARD_TIMEZONE = "Asia/Kolkata";
const DAY_MS = 86400000;
const OFFSET_MS = 19800000;

export const dashboardDateKey = (date = new Date()) =>
  new Date(new Date(date).getTime() + OFFSET_MS).toISOString().slice(0, 10);

export const dashboardDayRange = (day = dashboardDateKey()) => ({
  start: new Date(`${day}T00:00:00.000+05:30`),
  end: new Date(`${day}T23:59:59.999+05:30`),
});

export const shiftDashboardDay = (day, amount) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * DAY_MS).toISOString().slice(0, 10);

export const dashboardMonthStart = (year, monthIndex) => {
  const key = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
  return dashboardDayRange(key).start;
};
