import { getPay2AllBbpsConfig, ensurePay2AllBbpsToken, fetchPay2AllBbpsBill } from "./pay2AllHelper.js";

// BBPS fetch-bill is currently wired for these two categories only.
const SUPPORTED_SERVICE_SLUGS = ["electricity", "water"];

export const fetchLiveBillForService = async ({ serviceSlug, provider, consumerNumber }) => {
  if (!SUPPORTED_SERVICE_SLUGS.includes(serviceSlug)) {
    const error = new Error(`Live bill fetch is not available for ${serviceSlug}`);
    error.statusCode = 400;
    throw error;
  }
  if (!provider || !consumerNumber) {
    const error = new Error("provider and consumerNumber are required");
    error.statusCode = 400;
    throw error;
  }

  const config = await getPay2AllBbpsConfig();
  ensurePay2AllBbpsToken(config);

  const billerEntry = config.billerMap[provider];
  if (!billerEntry?.billerId || !billerEntry?.paramKey) {
    const error = new Error(`No BBPS biller is configured for "${provider}". Add it in System Settings → Recharge API → BBPS Biller Map.`);
    error.statusCode = 400;
    throw error;
  }

  const billData = await fetchPay2AllBbpsBill(billerEntry.billerId, {
    [billerEntry.paramKey]: consumerNumber,
  });

  if (!billData.amount || !billData.referenceId) {
    const error = new Error("Pay2All did not return a usable bill amount for this consumer number");
    error.statusCode = 400;
    throw error;
  }

  return {
    success: true,
    amount: Number(billData.amount),
    customerName: billData.customerName || "",
    dueDate: billData.dueDate || "",
    referenceId: billData.referenceId,
  };
};
