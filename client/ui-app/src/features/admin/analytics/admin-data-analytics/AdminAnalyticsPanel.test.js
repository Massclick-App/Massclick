import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminAnalyticsPanel from "./AdminAnalyticsPanel.js";
import axiosInstance from "shared/services/axiosInstance.js";
import { dashboardDayRange, dashboardDateKey } from "shared/utils/dashboardDates.js";

jest.mock("shared/services/axiosInstance.js", () => ({ get: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), useLocation: () => ({ hash: '' }) }));
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(), useSelector: selector => selector({ auth: { user: { userName: "MassClick", userRole: "SuperAdmin" } } }) }));
jest.mock("state/actions/businessListAction.js", () => ({ getDashboardSummary: jest.fn() }));
jest.mock("recharts", () => ({}));
jest.mock("shared/components/Header.js", () => () => null);

const report = (businesses) => ({ data: { report: { totals: { businesses, liveBusinesses: businesses }, creatorOptions: [] } } });

beforeEach(() => jest.clearAllMocks());

test('shows the account username and allows viewing businesses outside the recent date range', async () => {
  axiosInstance.get.mockResolvedValue(report(42));
  render(<AdminAnalyticsPanel redesigned />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('MassClick!');
  fireEvent.click(screen.getByRole('button', { name: 'All time' }));
  await waitFor(() => expect(axiosInstance.get).toHaveBeenLastCalledWith(expect.any(String), {
    params: { days: Math.round((new Date(`${dashboardDateKey()}T12:00:00Z`) - new Date(`${dashboardDateKey().slice(0, 4)}-01-01T12:00:00Z`)) / 86400000) + 1 },
  }));
});

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

test("redesigned dashboard keeps report dates when drilling into active businesses", async () => {
  axiosInstance.get.mockResolvedValue(report(42));
  const onFilterClick = jest.fn();
  render(<AdminAnalyticsPanel redesigned onFilterClick={onFilterClick} />);
  const card = (await screen.findAllByRole("button", { name: /Active Businesses/ }))[0];
  await waitFor(() => expect(card).toBeEnabled());
  fireEvent.click(card);
  expect(onFilterClick).toHaveBeenCalledWith(expect.objectContaining({ type: "active", scope: expect.objectContaining({ createdFrom: expect.any(String), createdTo: expect.any(String) }) }));
  fireEvent.click(screen.getAllByRole("button", { name: "7D" })[0]);
  await waitFor(() => expect(axiosInstance.get).toHaveBeenLastCalledWith(expect.any(String), { params: expect.objectContaining({ days: 7 }) }));
});

test("redesigned dashboard disables drill-downs when the report fails", async () => {
  axiosInstance.get.mockRejectedValue(new Error("Report unavailable"));
  render(<AdminAnalyticsPanel redesigned />);
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: /Total Businesses/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
});

test('dashboard defaults to year-to-date including January 1 in the India reporting timezone', async () => {
  axiosInstance.get.mockResolvedValue(report(42));
  render(<AdminAnalyticsPanel redesigned />);
  expect(screen.getByRole('button', { name: 'YTD' })).toHaveAttribute('aria-pressed', 'true');
  const today = dashboardDateKey();
  await waitFor(() => expect(axiosInstance.get).toHaveBeenLastCalledWith(expect.any(String), { params: expect.objectContaining({ dateFrom: dashboardDayRange(`${today.slice(0, 4)}-01-01`).dateFrom, dateTo: dashboardDayRange(today).dateTo }) }));
});

test('custom dates, search shortcut, and unmeasured SEO values are usable without invented counts', async () => {
  axiosInstance.get.mockResolvedValue(report(42));
  render(<AdminAnalyticsPanel redesigned />);
  fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-12-01' } });
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2025-12-10' } });
  await waitFor(() => expect(axiosInstance.get).toHaveBeenLastCalledWith(expect.any(String), { params: expect.objectContaining({ days: 10, dateFrom: dashboardDayRange('2025-12-01').dateFrom, dateTo: dashboardDayRange('2025-12-10').dateTo }) }));
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
  expect(screen.getByLabelText('Search businesses')).toHaveFocus();
  expect(screen.getByRole('button', { name: /Indexed Pages/ })).toHaveTextContent('—');
});
