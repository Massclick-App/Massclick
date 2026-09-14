import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardVisuals } from './dashboardVisuals.js';
import business from '../../model/businessList/businessListModel.js';
import enquiry from '../../model/enquiry/enquiryModel.js';
import users from '../../model/userModel.js';
import reviews from '../../model/businessReview/businessReviewModel.js';
import seo from '../../model/seoModel/seoModel.js';
import pages from '../../model/seoModel/seoPageContentModel.js';
import blogs from '../../model/seoModel/seoPageContentBlogModel.js';

const params = { role: 'SuperAdmin', businessQuery: { createdBy: 'restricted-user' }, dayTrendQuery: { createdBy: 'restricted-user', location: 'Trichy' }, periodStart: new Date('2026-08-01T00:00:00Z'), periodEnd: new Date('2026-08-31T23:59:59Z') };
const emptyFind = () => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) });
function setup(t) {
  for (const model of [business, enquiry, users, reviews, seo]) t.mock.method(model, 'aggregate', async () => []);
  t.mock.method(business, 'find', emptyFind); t.mock.method(users, 'find', emptyFind);
  t.mock.method(pages, 'countDocuments', async () => 0); t.mock.method(blogs, 'countDocuments', async () => 0);
}
test('supplemental charts and reviews preserve access scope and do not invent audit results', async t => {
  setup(t);
  seo.aggregate.mock.mockImplementation(async () => [{ pages: 100, missingTitles: 10, missingDescriptions: 20, missingCanonicals: 0 }]);
  const report = await getDashboardVisuals(params);
  assert.equal(report.seoHealth.score, 90);
  assert.equal(report.seoHealth.indexedPages, null);
  assert.equal(report.seoHealth.brokenLinks, null);
  assert.equal(report.seoHealth.schemaCoverage, null);
  assert.deepEqual(business.aggregate.mock.calls[0].arguments[0][0].$match.$and[0], params.dayTrendQuery);
  assert.deepEqual(business.aggregate.mock.calls[1].arguments[0][0].$match, params.businessQuery);
  assert.deepEqual(reviews.aggregate.mock.calls[0].arguments[0][1].$lookup.pipeline[0].$match.$and[0], params.businessQuery);
});
test('unavailable optional sources are distinguished from zero and do not fail the full dashboard', async t => {
  setup(t); business.aggregate.mock.mockImplementation(async () => { throw new Error('Database unavailable'); });
  const report = await getDashboardVisuals(params);
  assert.equal(report.activeTrend, null);
  assert.equal(report.revenueTrend, null);
  assert.ok(report.unavailableSections.includes('activeTrend'));
  assert.ok(report.unavailableSections.includes('mapClusters'));
});
test('non-superadmins do not query account-wide SEO, enquiry, or user datasets', async t => {
  setup(t); const report = await getDashboardVisuals({ ...params, role: 'Admin' });
  for (const model of [enquiry, users, seo]) assert.equal(model.aggregate.mock.callCount(), 0);
  assert.equal(users.find.mock.callCount(), 0);
  assert.equal(pages.countDocuments.mock.callCount(), 0);
  assert.equal(report.enquiryTrend, null);
  assert.equal(report.seoHealth, null);
});
