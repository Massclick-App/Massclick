export function normalizeLeadsFromSearchLogs(logs = []) {
  const users = [];

  logs.forEach((log) => {
    const base = {
      logId: log._id,
      categoryName: log.categoryName,
      searchedUserText: log.searchedUserText,
      location: log.location,
      createdAt: log.createdAt,
    };

    (log.userDetails || []).forEach((u) => {
      users.push({
        ...base,
        userName: u.userName || "Unknown",
        mobileNumber1: u.mobileNumber1 || "",
        mobileNumber2: u.mobileNumber2 || "",
        email: u.email || "",
      });
    });
  });

  const seen = new Set();
  return users.filter((u) => {
    const key = u.mobileNumber1 || u.email || u.userName;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
