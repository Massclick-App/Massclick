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

export const isDisplayableLeadNotification = (lead = {}) => {
  const user = getLeadUser(lead);
  return hasValue(user.userName) && hasValue(lead.searchedUserText);
};

export const getDisplayableLeadNotifications = (leads = []) => (
  Array.isArray(leads) ? leads.filter(isDisplayableLeadNotification) : []
);
