import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminAnalyticsPanel from "./AdminAnalyticsPanel.js";
import axiosInstance from "shared/services/axiosInstance.js";
import { dashboardDayRange } from "shared/utils/dashboardDates.js";

jest.mock("shared/services/axiosInstance.js", () => ({ get: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn() }));
jest.mock("state/actions/businessListAction.js", () => ({ getDashboardSummary: jest.fn() }));
jest.mock("recharts", () => ({}));

const report = (businesses) => ({ data: { report: { totals: { businesses, liveBusinesses: businesses }, creatorOptions: [] } } });

beforeEach(() => jest.clearAllMocks());

test("a selected-day count is labelled as a selection and keeps its dates in the table action", async () => {
  axiosInstance.get.mockResolvedValueOnce(report(12015)).mockResolvedValue(report(52));
  const onFilterClick = jest.fn();
  render(<AdminAnalyticsPanel onFilterClick={onFilterClick} />);
  await screen.findByText("All businesses");
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Reporting period" }));
  fireEvent.click(within(screen.getByRole("listbox")).getByText("Specific day"));
  await screen.findByText("52");
  const day = screen.getByLabelText("Select day").value;
  await waitFor(() => expect(axiosInstance.get).toHaveBeenLastCalledWith(expect.any(String), {
    params: { days: 30, ...dashboardDayRange(day) },
  }));
  fireEvent.click(screen.getByRole("button", { name: /Businesses in selection/ }));
  expect(onFilterClick).toHaveBeenCalledWith(expect.objectContaining({
    type: "all",
    scope: { createdBy: "", createdFrom: dashboardDayRange(day).dateFrom, createdTo: dashboardDayRange(day).dateTo },
  }));
  expect(screen.queryByText("52 added in 30 days")).toBeNull();
});

test("a failed initial request shows an error without presenting zero totals", async () => {
  axiosInstance.get.mockRejectedValue(new Error("Report unavailable"));
  render(<AdminAnalyticsPanel />);
  await screen.findByText("Report unavailable");
  expect(screen.queryByText("All businesses")).toBeNull();
});
