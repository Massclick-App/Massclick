// Dashboard reporting uses India calendar dates, independent of browser timezone.
export const dashboardDateKey = (date = new Date()) =>
  new Date(new Date(date).getTime() + 19800000).toISOString().slice(0, 10);

export const dashboardDayRange = (day = dashboardDateKey()) => ({
  dateFrom: new Date(`${day}T00:00:00.000+05:30`).toISOString(),
  dateTo: new Date(`${day}T23:59:59.999+05:30`).toISOString(),
});

export const shiftDashboardDay = (day, amount) =>
  new Date(new Date(`${day}T00:00:00Z`).getTime() + amount * 86400000).toISOString().slice(0, 10);

export const dashboardMonthRange = (year, monthIndex) => ({
  dateFrom: dashboardDayRange(new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10)).dateFrom,
  dateTo: dashboardDayRange(new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10)).dateTo,
});
