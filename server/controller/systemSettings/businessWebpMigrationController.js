import {
  getBusinessWebpMigrationJobById,
  getLatestBusinessWebpMigrationJob,
  startBusinessWebpMigration,
} from "../../helper/businessList/businessWebpMigrationHelper.js";

const clampInteger = (value, min, max, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const startBusinessWebpMigrationAction = async (req, res) => {
  try {
    const deleteOriginals = req.body?.deleteOriginals !== false;
    const batchSize = clampInteger(req.body?.batchSize, 10, 500, 100);
    const retryCount = clampInteger(req.body?.retryCount, 1, 5, 3);

    const result = await startBusinessWebpMigration({
      deleteOriginals,
      batchSize,
      retryCount,
      createdBy: req.authUser,
    });

    return res.status(result.alreadyRunning ? 200 : 202).json({
      success: true,
      data: result.job,
      alreadyRunning: result.alreadyRunning,
    });
  } catch (error) {
    console.error("startBusinessWebpMigrationAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to start migration",
    });
  }
};

export const getLatestBusinessWebpMigrationJobAction = async (req, res) => {
  try {
    const job = await getLatestBusinessWebpMigrationJob();
    return res.json({ success: true, data: job || null });
  } catch (error) {
    console.error("getLatestBusinessWebpMigrationJobAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load migration job",
    });
  }
};

export const getBusinessWebpMigrationJobAction = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getBusinessWebpMigrationJobById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Migration job not found",
      });
    }

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error("getBusinessWebpMigrationJobAction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load migration job",
    });
  }
};
