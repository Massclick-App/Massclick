import { dashboardDateKey, dashboardDayRange, dashboardMonthRange, shiftDashboardDay } from "./dashboardDates.js";

test("selected day and today use the same India-time boundaries", () => {
  const day = dashboardDateKey("2026-09-09T20:00:00Z");
  expect(day).toBe("2026-09-10");
  expect(dashboardDayRange(day)).toEqual({
    dateFrom: "2026-09-09T18:30:00.000Z",
    dateTo: "2026-09-10T18:29:59.999Z",
  });
});

test("month drill-down includes the full India calendar month", () => {
  expect(dashboardMonthRange(2024, 1)).toEqual({
    dateFrom: "2024-01-31T18:30:00.000Z",
    dateTo: "2024-02-29T18:29:59.999Z",
  });
  expect(shiftDashboardDay("2026-01-01", -1)).toBe("2025-12-31");
});
