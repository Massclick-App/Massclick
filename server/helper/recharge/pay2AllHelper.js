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
