import message91UserModel from "../../model/msg91Model/usersModels.js";
import searchLogModel from "../../model/businessList/searchLogModel.js";

const buildCategoryRegex = (rawCategory) => {
  if (!rawCategory) return null;
  const base = rawCategory.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");
  return new RegExp(`\\b${base}s?\\b`, "i");
};

const getCategorySearchLogs = async (rawCategory, extraMatch = {}) => {
  const regex = buildCategoryRegex(rawCategory);
  if (!regex) return [];
  return searchLogModel.find({
    $or: [
      { categoryName: regex },
      { categoryName: /all categories/i, searchedUserText: regex },
      { searchedUserText: regex },
    ],
    ...extraMatch,
  }).lean();
};

export const getCategoryBasedLeads = async (mobileNumber) => {
  const normalizedMobile = String(mobileNumber).trim();

  const user = await message91UserModel.findOne({
    mobileNumber1: normalizedMobile,
  }).lean();

  if (!user) {
    throw new Error("User not found");
  }

  const rawCategory = user?.businessCategory?.category || "";

  let searchLogs = [];

  if (rawCategory) {
    const baseCategory = rawCategory
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .replace(/s$/, "");

    const categoryWordRegex = new RegExp(`\\b${baseCategory}s?\\b`, "i");

    searchLogs = await searchLogModel.find({
      $or: [
        { categoryName: categoryWordRegex },
        {
          categoryName: /all categories/i,
          searchedUserText: categoryWordRegex,
        },
        { searchedUserText: categoryWordRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  return {
    user: {
      userName: user.userName,
      mobileNumber1: user.mobileNumber1,
      category: rawCategory || null,
    },
    leadsData: user.leadsData || [],
    matchedSearchLogs: searchLogs,
  };
};

export const getLeadsAnalyticsSummary = async (mobileNumber) => {
  const normalizedMobile = String(mobileNumber).trim();

  const user = await message91UserModel.findOne({ mobileNumber1: normalizedMobile }).lean();
  if (!user) throw new Error("User not found");

  const leads = user.leadsData || [];
  const rawCategory = user?.businessCategory?.category || "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const searchLogs = await getCategorySearchLogs(rawCategory);

  const todaySearchLogs = searchLogs.filter((log) => new Date(log.createdAt) >= today);
  const identified = searchLogs.filter((log) => !log.isAnonymous && log.userDetails?.length > 0);
  const anonymous = searchLogs.filter((log) => log.isAnonymous || !log.userDetails?.length);

  return {
    category: rawCategory || null,
    leads: {
      total: leads.length,
      unread: leads.filter((l) => !l.isReaded).length,
      read: leads.filter((l) => l.isReaded).length,
      whatsappSent: leads.filter((l) => l.isWhatsappSend).length,
    },
    searchMatches: {
      total: searchLogs.length,
      today: todaySearchLogs.length,
      identified: identified.length,
      anonymous: anonymous.length,
    },
  };
};

export const getLeadsTrends = async (mobileNumber, days = 30) => {
  const normalizedMobile = String(mobileNumber).trim();

  const user = await message91UserModel.findOne({ mobileNumber1: normalizedMobile }).lean();
  if (!user) throw new Error("User not found");

  const rawCategory = user?.businessCategory?.category || "";
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const searchLogs = await getCategorySearchLogs(rawCategory, {
    createdAt: { $gte: since },
  });

  const countsByDate = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    countsByDate[key] = 0;
  }

  for (const log of searchLogs) {
    const key = new Date(log.createdAt).toISOString().slice(0, 10);
    if (key in countsByDate) countsByDate[key]++;
  }

  const dailyTrends = Object.entries(countsByDate).map(([date, count]) => ({
    date,
    count,
  }));

  return {
    category: rawCategory || null,
    days,
    dailyTrends,
    totalInPeriod: searchLogs.length,
  };
};

export const getTopSearches = async (mobileNumber, limit = 10) => {
  const normalizedMobile = String(mobileNumber).trim();

  const user = await message91UserModel.findOne({ mobileNumber1: normalizedMobile }).lean();
  if (!user) throw new Error("User not found");

  const rawCategory = user?.businessCategory?.category || "";
  const regex = buildCategoryRegex(rawCategory);

  if (!regex) {
    return { category: null, topQueries: [], topLocations: [], uniqueSearchers: 0 };
  }

  const [queriesAgg, locationsAgg, searcherCountAgg] = await Promise.all([
    searchLogModel.aggregate([
      {
        $match: {
          $or: [
            { categoryName: regex },
            { categoryName: /all categories/i, searchedUserText: regex },
            { searchedUserText: regex },
          ],
          searchedUserText: { $ne: "" },
        },
      },
      { $group: { _id: "$searchedUserText", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, query: "$_id", count: 1 } },
    ]),

    searchLogModel.aggregate([
      {
        $match: {
          $or: [
            { categoryName: regex },
            { categoryName: /all categories/i, searchedUserText: regex },
            { searchedUserText: regex },
          ],
          location: { $ne: "" },
        },
      },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, location: "$_id", count: 1 } },
    ]),

    searchLogModel.aggregate([
      {
        $match: {
          $or: [
            { categoryName: regex },
            { categoryName: /all categories/i, searchedUserText: regex },
            { searchedUserText: regex },
          ],
        },
      },
      { $unwind: "$userDetails" },
      {
        $group: {
          _id: "$userDetails.mobileNumber1",
        },
      },
      { $count: "uniqueSearchers" },
    ]),
  ]);

  return {
    category: rawCategory || null,
    topQueries: queriesAgg,
    topLocations: locationsAgg,
    uniqueSearchers: searcherCountAgg[0]?.uniqueSearchers ?? 0,
  };
};
