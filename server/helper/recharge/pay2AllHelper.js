import axios from "axios";
import { getSettings } from "../systemSettings/settingsService.js";

const DEFAULT_PAY2ALL_BASE_URL = "https://www.pay2all.in/api/v1";

const normalizeBaseUrl = (value) => {
  const raw = String(value || DEFAULT_PAY2ALL_BASE_URL).trim();
  return raw.replace(/\/+$/, "");
};

export const getPay2AllConfig = async () => {
  const settings = await getSettings();
  const token = String(settings.recharge_pay2all_api_token || "").trim();

  return {
    enabled: Boolean(settings.recharge_api_enabled),
    provider: "pay2all",
    baseUrl: normalizeBaseUrl(settings.recharge_pay2all_base_url),
    webhookPath: settings.recharge_pay2all_webhook_path || "/api/recharge/pay2all/webhook",
    token,
  };
};

export const ensurePay2AllToken = (config) => {
  if (!config?.token) {
    const error = new Error("Pay2All API token is not configured");
    error.statusCode = 400;
    throw error;
  }
};

export const fetchPay2AllBalance = async () => {
  const config = await getPay2AllConfig();
  ensurePay2AllToken(config);

  const response = await axios.get(`${config.baseUrl}/balance`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/json",
    },
    timeout: 15000,
  });

  return response.data;
};

// BBPS (bill fetch/pay) is a separate, dashboard-authenticated route group per
// Pay2All's docs: it lives under /api (not /api/v1) and rejects the org API
// token above — it needs a distinct "login access token" pasted into settings.
const DEFAULT_PAY2ALL_BBPS_BASE_URL = "https://www.pay2all.in/api";

const deriveBbpsBaseUrl = (v1BaseUrl) => {
  const stripped = normalizeBaseUrl(v1BaseUrl).replace(/\/v1$/, "");
  return stripped || DEFAULT_PAY2ALL_BBPS_BASE_URL;
};

export const getPay2AllBbpsConfig = async () => {
  const settings = await getSettings();
  const token = String(settings.recharge_pay2all_bbps_token || "").trim();

  return {
    enabled: Boolean(settings.recharge_api_enabled),
    baseUrl: deriveBbpsBaseUrl(settings.recharge_pay2all_base_url),
    token,
    billerMap: settings.recharge_pay2all_bbps_biller_map || {},
  };
};

export const ensurePay2AllBbpsToken = (config) => {
  if (!config?.token) {
    const error = new Error("Pay2All BBPS login token is not configured. Add it in System Settings — it is separate from the regular API token.");
    error.statusCode = 400;
    throw error;
  }
};

const bbpsHeaders = (config) => ({
  Authorization: `Bearer ${config.token}`,
  Accept: "application/json",
});

// Raw pass-throughs: Pay2All's docs describe these discovery endpoints but
// don't show an example response body, so we don't assume a shape here —
// callers (currently the admin BBPS explorer) inspect the real payload.
export const fetchPay2AllBbpsCategoriesRaw = async () => {
  const config = await getPay2AllBbpsConfig();
  ensurePay2AllBbpsToken(config);

  const response = await axios.get(`${config.baseUrl}/bbps/categories`, {
    headers: bbpsHeaders(config),
    timeout: 15000,
  });

  return response.data;
};

export const fetchPay2AllBbpsBillersRaw = async (categorySlug) => {
  const config = await getPay2AllBbpsConfig();
  ensurePay2AllBbpsToken(config);

  const response = await axios.get(`${config.baseUrl}/bbps/category/${encodeURIComponent(categorySlug)}`, {
    headers: bbpsHeaders(config),
    timeout: 15000,
  });

  return response.data;
};

export const fetchPay2AllBbpsBillerFieldsRaw = async (billerId) => {
  const config = await getPay2AllBbpsConfig();
  ensurePay2AllBbpsToken(config);

  const response = await axios.get(`${config.baseUrl}/bbps/biller/${encodeURIComponent(billerId)}`, {
    headers: bbpsHeaders(config),
    timeout: 15000,
  });

  return response.data;
};

// Fetches the live due bill for a biller. billerId/params follow the
// documented contract exactly: params is an object keyed by the biller's
// own field names (e.g. { "Consumer Number": "1234567890" }).
export const fetchPay2AllBbpsBill = async (billerId, params) => {
  const config = await getPay2AllBbpsConfig();
  ensurePay2AllBbpsToken(config);

  const response = await axios.post(
    `${config.baseUrl}/bbps/fetch-bill`,
    { billerId, params },
    {
      headers: { ...bbpsHeaders(config), "Content-Type": "application/json" },
      timeout: 20000,
    },
  );

  if (response.data?.status_id !== 1) {
    const error = new Error(response.data?.message || "Bill fetch failed");
    error.statusCode = 400;
    throw error;
  }

  return response.data.data || {};
};
