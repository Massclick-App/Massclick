import test from "node:test";
import assert from "node:assert/strict";
import { dashboardDateKey, dashboardDayRange, shiftDashboardDay, dashboardMonthStart } from "./dashboardDates.js";

test("today changes at India midnight, not UTC midnight", () => {
  assert.equal(dashboardDateKey("2026-09-09T18:29:59.999Z"), "2026-09-09");
  assert.equal(dashboardDateKey("2026-09-09T18:30:00.000Z"), "2026-09-10");
  const { start, end } = dashboardDayRange("2026-09-10");
  assert.equal(start.toISOString(), "2026-09-09T18:30:00.000Z");
  assert.equal(end.toISOString(), "2026-09-10T18:29:59.999Z");
  // Listings created before UTC midnight must still be counted for September 10.
  const listings = ["2026-09-09T18:29:59Z", "2026-09-09T20:00:00Z", "2026-09-10T05:00:00Z", "2026-09-10T19:00:00Z"];
  assert.equal(listings.filter((value) => new Date(value) >= start && new Date(value) <= end).length, 2);
});

test("reporting periods cross month, leap day and year boundaries", () => {
  assert.equal(shiftDashboardDay("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDashboardDay("2024-03-01", -1), "2024-02-29");
  assert.equal(dashboardMonthStart(2026, -1).toISOString(), "2025-11-30T18:30:00.000Z");
});
