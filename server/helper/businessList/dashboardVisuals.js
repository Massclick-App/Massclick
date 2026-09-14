import businessListModel from '../../model/businessList/businessListModel.js';
import enquiryModel from '../../model/enquiry/enquiryModel.js';
import userModel from '../../model/userModel.js';
import businessReviewModel from '../../model/businessReview/businessReviewModel.js';
import seoModel from '../../model/seoModel/seoModel.js';
import seoPageContentModel from '../../model/seoModel/seoPageContentModel.js';
import seoPageContentBlogModel from '../../model/seoModel/seoPageContentBlogModel.js';
import { DASHBOARD_TIMEZONE } from '../../utils/dashboardDates.js';

// Supplemental dashboard data uses the same business access and date scope as
// the main report. Account-wide content checks are restricted to SuperAdmin.
export async function getDashboardVisuals({ businessQuery, dayTrendQuery, periodStart, periodEnd, role }) {
  const range = { $gte: periodStart, $lte: periodEnd };
  const dailyQuery = { $and: [dayTrendQuery, { createdAt: range }] };
  const results = await Promise.allSettled([
    businessListModel.aggregate([
      { $match: dailyQuery },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: DASHBOARD_TIMEZONE } }, activeBusinesses: { $sum: { $cond: ['$activeBusinesses', 1, 0] } } } },
    ]),
    role === 'SuperAdmin' ? enquiryModel.aggregate([
      { $match: { submittedAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$submittedAt', timezone: DASHBOARD_TIMEZONE } }, enquiries: { $sum: 1 } } },
    ]) : Promise.resolve(null),
    businessListModel.aggregate([
      { $match: businessQuery },
      { $project: { location: 1, lng: { $arrayElemAt: ['$geoLocation.coordinates', 0] }, lat: { $arrayElemAt: ['$geoLocation.coordinates', 1] } } },
      { $match: { lat: { $type: 'number', $gte: -85, $lte: 85 }, lng: { $type: 'number', $gte: -180, $lte: 180 }, $or: [{ lat: { $ne: 0 } }, { lng: { $ne: 0 } }] } },
      // Approximately 1 km cells: distinct neighbourhoods in one city must
      // not collapse into a single city-wide average coordinate.
      { $group: { _id: { location: '$location', latCell: { $floor: { $multiply: ['$lat', 100] } }, lngCell: { $floor: { $multiply: ['$lng', 100] } } }, count: { $sum: 1 }, lat: { $avg: '$lat' }, lng: { $avg: '$lng' } } },
      { $sort: { count: -1, '_id.latCell': 1, '_id.lngCell': 1 } },
      { $project: { _id: 0, name: { $ifNull: ['$_id.location', 'Unknown'] }, count: 1, lat: 1, lng: 1 } },
    ]),
    businessListModel.find(businessQuery, { businessName: 1, location: 1, createdAt: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(8).lean(),
    role === 'SuperAdmin' ? userModel.find({}, { userName: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(3).lean() : Promise.resolve([]),
    role === 'SuperAdmin' ? seoModel.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, pages: { $sum: 1 }, missingTitles: { $sum: { $cond: [{ $eq: [{ $trim: { input: { $ifNull: ['$title', ''] } } }, ''] }, 1, 0] } }, missingDescriptions: { $sum: { $cond: [{ $eq: [{ $trim: { input: { $ifNull: ['$description', ''] } } }, ''] }, 1, 0] } }, missingCanonicals: { $sum: { $cond: [{ $eq: [{ $trim: { input: { $ifNull: ['$canonical', ''] } } }, ''] }, 1, 0] } } } },
    ]) : Promise.resolve(null),
    role === 'SuperAdmin' ? seoPageContentModel.countDocuments({ isActive: true }) : Promise.resolve(null),
    role === 'SuperAdmin' ? seoPageContentBlogModel.countDocuments({ isActive: true }) : Promise.resolve(null),
    businessReviewModel.aggregate([
      { $match: { createdAt: range } },
      { $lookup: { from: businessListModel.collection.name, let: { businessId: '$businessId' }, pipeline: [{ $match: { $and: [businessQuery, { $expr: { $eq: ['$_id', '$$businessId'] } }] } }, { $project: { businessName: 1, location: 1 } }], as: 'business' } },
      { $unwind: '$business' }, { $sort: { createdAt: -1 } }, { $limit: 4 },
      { $project: { _id: 1, createdAt: 1, rating: 1, businessName: '$business.businessName', location: '$business.location' } },
    ]),
    role === 'SuperAdmin' ? userModel.aggregate([{ $match: { createdAt: range } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: DASHBOARD_TIMEZONE } }, users: { $sum: 1 } } }]) : Promise.resolve(null),
    businessListModel.aggregate([{ $match: businessQuery }, { $unwind: '$payment' }, { $match: { 'payment.paymentDate': range, 'payment.paymentStatus': { $in: ['SUCCESS', 'PAID', 'paid', 'success'] } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$payment.paymentDate', timezone: DASHBOARD_TIMEZONE } }, revenue: { $sum: { $ifNull: ['$payment.totalAmount', { $ifNull: ['$payment.amount', 0] }] } } } }]),
  ]);
  const value = (index, fallback) => results[index].status === 'fulfilled' ? results[index].value : fallback;
  const metadata = value(5, null)?.[0];
  const activities = [
    ...value(3, []).map(item => ({ id: String(item._id), type: new Date(item.updatedAt || item.createdAt) - new Date(item.createdAt) > 60000 ? 'updated' : 'business', title: new Date(item.updatedAt || item.createdAt) - new Date(item.createdAt) > 60000 ? 'Business updated' : 'New business added', name: item.businessName, location: item.location, date: item.updatedAt || item.createdAt })),
    ...value(4, []).map(item => ({ id: String(item._id), type: 'user', title: 'New user registered', name: item.userName, date: item.createdAt })),
    ...value(8, []).map(item => ({ id: String(item._id), type: 'review', title: 'Review submitted', name: item.businessName, location: item.location, date: item.createdAt })),
  ].filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  return {
    activeTrend: value(0, null), enquiryTrend: value(1, null), userTrend: value(9, null), revenueTrend: value(10, null), mapClusters: value(2, []), recentActivities: activities,
    seoHealth: metadata ? { ...metadata, score: Math.round(100 * (1 - (metadata.missingTitles + metadata.missingDescriptions + metadata.missingCanonicals) / Math.max(1, metadata.pages * 3))), indexedPages: null, brokenLinks: null, schemaCoverage: null, method: 'Completeness of titles, descriptions and canonical URLs on active SEO records.' } : null,
    contentTotals: { articles: value(6, null), blogs: value(7, null) },
    recentReviews: value(8, []),
    unavailableSections: results.flatMap((result, i) => result.status === 'rejected' ? [['activeTrend', 'enquiryTrend', 'mapClusters', 'recentActivities', 'userActivity', 'seoHealth', 'articles', 'blogs', 'reviews', 'userTrend', 'revenueTrend'][i]] : []),
  };
}
