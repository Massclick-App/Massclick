import publicUserCounterSettingsModel from "../../model/publicUserCounter/publicUserCounterSettingsModel.js";
import categoryModel from "../../model/category/categoryModel.js";
import { deleteCache, getCache, setCache } from "../../utils/redisClient.js";

const CACHE_KEY = "public-user-counter:settings";

const clampNumber = (value, fallback, min = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.round(num));
};

const buildCategoryCounterDefaults = async () => {
  const categories = await categoryModel
    .find({
      isActive: true,
      $or: [
        { categoryType: "Primary Category" },
        { categoryType: { $exists: false } },
        { categoryType: "" },
      ],
    })
    .sort({ category: 1 })
    .limit(12)
    .select("category slug")
    .lean();

  return categories.map((category, index) => ({
    name: category.category,
    slug: category.slug || category.category?.toLowerCase().replace(/\s+/g, "-"),
    baseCount: 500 + index * 125,
    incrementMin: 0,
    incrementMax: 2,
    intervalSeconds: 30,
    startedAt: new Date(),
    enabled: true,
  }));
};

const normalizeCounterSettings = async (payload = {}) => {
  const incrementMin = clampNumber(payload.incrementMin, 1);
  const incrementMax = Math.max(incrementMin, clampNumber(payload.incrementMax, 5));

  return {
    enabled: payload.enabled !== false,
    title: String(payload.title || "Public Users").trim(),
    subtitle: String(payload.subtitle || "Public Users Connected").trim(),
    baseCount: clampNumber(payload.baseCount, 52487),
    todayBaseCount: clampNumber(payload.todayBaseCount, 127),
    onlineBaseCount: clampNumber(payload.onlineBaseCount, 143),
    incrementMin,
    incrementMax,
    intervalSeconds: clampNumber(payload.intervalSeconds, 30, 10),
    resetDaily: payload.resetDaily !== false,
    startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
    categories: Array.isArray(payload.categories)
      ? payload.categories
          .map((item) => {
            const categoryMin = clampNumber(item.incrementMin, 0);
            return {
              name: String(item.name || "").trim(),
              slug: String(item.slug || "").trim(),
              baseCount: clampNumber(item.baseCount, 0),
              incrementMin: categoryMin,
              incrementMax: Math.max(categoryMin, clampNumber(item.incrementMax, 2)),
              intervalSeconds: clampNumber(item.intervalSeconds, 30, 10),
              startedAt: item.startedAt ? new Date(item.startedAt) : new Date(),
              enabled: item.enabled !== false,
            };
          })
          .filter((item) => item.name)
      : await buildCategoryCounterDefaults(),
  };
};

const getOrCreateSettings = async () => {
  let settings = await publicUserCounterSettingsModel.findOne().lean();
  if (settings) {
    if (!Array.isArray(settings.categories) || settings.categories.length === 0) {
      settings = await publicUserCounterSettingsModel.findOneAndUpdate(
        {},
        { $set: { categories: await buildCategoryCounterDefaults() } },
        { new: true }
      ).lean();
    }
    return settings;
  }

  const created = await publicUserCounterSettingsModel.create({
    intervalSeconds: 30,
    categories: await buildCategoryCounterDefaults(),
  });
  return created.toObject();
};

export const getAdminPublicUserCounterAction = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error("getAdminPublicUserCounterAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminPublicUserCounterAction = async (req, res) => {
  try {
    const existing = await publicUserCounterSettingsModel.findOne().lean();
    const updates = await normalizeCounterSettings(req.body);
    updates.updatedBy = req.authUser?.email || "admin";
    const now = new Date();
    if (!existing || Number(existing.baseCount) !== Number(updates.baseCount)) {
      updates.startedAt = now;
      updates.lastResetAt = now;
    }
    const existingCategoryMap = new Map(
      (existing?.categories || []).map((item) => [
        item.slug || item.name?.toLowerCase(),
        item,
      ])
    );
    updates.categories = (updates.categories || []).map((category) => {
      const key = category.slug || category.name?.toLowerCase();
      const existingCategory = existingCategoryMap.get(key);
      const baseChanged = !existingCategory || Number(existingCategory.baseCount) !== Number(category.baseCount);
      return {
        ...category,
        startedAt: baseChanged ? now : (category.startedAt || existingCategory?.startedAt || now),
      };
    });

    const saved = await publicUserCounterSettingsModel.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    await deleteCache(CACHE_KEY);
    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    console.error("updateAdminPublicUserCounterAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetAdminPublicUserCounterAction = async (req, res) => {
  try {
    const adminEmail = req.authUser?.email || "admin";
    const settings = await getOrCreateSettings();
    const baseCount = clampNumber(req.body?.baseCount, settings.baseCount);
    const now = new Date();

    const saved = await publicUserCounterSettingsModel.findOneAndUpdate(
      {},
      {
        $set: {
          baseCount,
          startedAt: now,
          lastResetAt: now,
          categories: (settings.categories || []).map((category) => ({
            ...category,
            startedAt: now,
          })),
          updatedBy: adminEmail,
        },
      },
      { new: true, upsert: true }
    ).lean();

    await deleteCache(CACHE_KEY);
    return res.status(200).json({ success: true, data: saved });
  } catch (error) {
    console.error("resetAdminPublicUserCounterAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicUserCounterAction = async (req, res) => {
  try {
    const cached = await getCache(CACHE_KEY);
    if (cached) return res.status(200).json(cached);

    const settings = await getOrCreateSettings();
    const payload = {
      enabled: settings.enabled,
      title: settings.title,
      subtitle: settings.subtitle,
      baseCount: settings.baseCount,
      todayBaseCount: settings.todayBaseCount,
      onlineBaseCount: settings.onlineBaseCount,
      incrementMin: settings.incrementMin,
      incrementMax: settings.incrementMax,
      intervalSeconds: settings.intervalSeconds,
      resetDaily: settings.resetDaily !== false,
      startedAt: settings.startedAt,
      categories: (settings.categories || []).filter((item) => item.enabled),
      serverTime: new Date().toISOString(),
    };

    await setCache(CACHE_KEY, payload, 300);
    return res.status(200).json(payload);
  } catch (error) {
    console.error("getPublicUserCounterAction error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
