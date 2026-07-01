import cron from "node-cron";
import { checkAllTrackedKeywords } from "../helper/gsc/trackedKeywordHelper.js";

const SCHEDULE = process.env.RANK_CRON_SCHEDULE || "0 6 * * 1"; // every Monday 6am

export const startKeywordRankCron = () => {
  cron.schedule(SCHEDULE, async () => {
    try {
      const result = await checkAllTrackedKeywords();
      console.log(`[KeywordRankCron] checked ${result.checked} keywords, skipped ${result.skipped.length}`);
    } catch (err) {
      console.error("[KeywordRankCron] run failed:", err.message);
    }
  });
  console.log(`[KeywordRankCron] scheduled with cron expression "${SCHEDULE}"`);
};
