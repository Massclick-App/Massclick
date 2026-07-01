export const formatCounterCount = (value) =>
  Number(value || 0).toLocaleString("en-IN");

const seededIncrement = (index, min, max) => {
  const low = Math.max(0, Number(min) || 0);
  const high = Math.max(low, Number(max) || low);
  const range = high - low + 1;
  const seed = Math.sin((index + 1) * 9301 + 49297) * 233280;
  return low + (Math.abs(Math.floor(seed)) % range);
};

const DAILY_RESET_HOUR = 7;

const getLocalDailyResetStart = (time) => {
  const date = new Date(time);
  date.setHours(DAILY_RESET_HOUR, 0, 0, 0);
  if (date.getTime() > time) {
    date.setDate(date.getDate() - 1);
  }
  return date.getTime();
};

export const getVisibleCounterCount = (config, now = Date.now()) => {
  if (!config) return 0;

  const base = Number(config.baseCount || 0);
  const intervalMs = Math.max(10, Number(config.intervalSeconds) || 30) * 1000;
  const rawStartedAt = new Date(config.dailyResetStartedAt || config.startedAt || now).getTime();
  const startedAt = Number.isFinite(rawStartedAt) ? rawStartedAt : now;
  const serverManagedReset = Boolean(config.dailyResetStartedAt || config.dailyResetTimeZone);
  const cycleStart = config.resetDaily === false || serverManagedReset
    ? startedAt
    : Math.max(startedAt, getLocalDailyResetStart(now));
  const elapsedIntervals = Math.max(0, Math.floor((now - cycleStart) / intervalMs));

  let growth = 0;
  for (let i = 0; i < elapsedIntervals; i += 1) {
    growth += seededIncrement(i, config.incrementMin, config.incrementMax);
  }

  return base + growth;
};
