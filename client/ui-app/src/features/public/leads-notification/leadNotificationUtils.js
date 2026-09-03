const EMPTY_LABELS = new Set(["unknown", "unknown user", "no data", "n/a", "na", "null", "undefined"]);

export const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text) return false;
  return !EMPTY_LABELS.has(text.toLowerCase());
};

export const getLeadUser = (lead = {}) => {
  if (Array.isArray(lead.userDetails)) {
    return lead.userDetails.find((user) => (
      hasValue(user?.userName) ||
      hasValue(user?.mobileNumber1) ||
      hasValue(user?.mobileNumber2) ||
      hasValue(user?.email)
    )) || {};
  }

  return lead;
};

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

export const getCurrentLeadViewer = () => {
  let authUser = {};

  try {
    authUser = JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    authUser = {};
  }

  return {
    ...authUser,
    mobileNumber1: authUser.mobileNumber1 || localStorage.getItem("mobileNumber") || "",
  };
};

export const isOwnLeadUser = (user = {}, currentUser = {}) => {
  const userMobiles = [
    user.mobileNumber1,
    user.mobileNumber2,
  ].map(onlyDigits).filter(Boolean);
  const currentMobiles = [
    currentUser.mobileNumber1,
    currentUser.mobileNumber2,
    currentUser.mobileNumber,
  ].map(onlyDigits).filter(Boolean);

  if (userMobiles.some((mobile) => currentMobiles.includes(mobile))) {
    return true;
  }

  return false;
};

export const isDisplayableLeadNotification = (lead = {}, currentUser = {}) => {
  const user = getLeadUser(lead);
  return (
    hasValue(user.userName) &&
    hasValue(lead.searchedUserText) &&
    !isOwnLeadUser(user, currentUser)
  );
};

export const getDisplayableLeadNotifications = (leads = [], currentUser = getCurrentLeadViewer()) => (
  Array.isArray(leads) ? leads.filter((lead) => isDisplayableLeadNotification(lead, currentUser)) : []
);
