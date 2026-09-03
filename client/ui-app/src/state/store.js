import { createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from 'state/reducers/authReducer.js';
import userReducer from 'state/reducers/userReducer.js';
import userClientReducer from 'state/reducers/userClientReducer.js'
import locationReducer from 'state/reducers/locationReducer.js'
import masterLocationReducer from 'state/reducers/masterLocationReducer.js'
import categoryReducer from 'state/reducers/categoryReducer.js'
import businessListReducer from 'state/reducers/businessListReducer.js'
import rolesReducer from 'state/reducers/rolesReducer.js';
import enquiryReducer from 'state/reducers/enquiryReducer.js';
import startProjectReducer from 'state/reducers/startProjectReducer.js'
import otpReducer from 'state/reducers/otpReducer.js'
import clientAuthReducer from 'state/reducers/clientAuthReducer.js'
import phonepeReducer from 'state/reducers/phonePayReducer.js';
import leadsReducer from 'state/reducers/leadsReducer.js';
import advertisementReducer from 'state/reducers/advertisementReducer.js';
import seoReducer from 'state/reducers/seoReducer.js';
import seoPageContentReducer from 'state/reducers/seoPageContentReducer.js'
import seoTemplateReducer from 'state/reducers/seoTemplateReducer.js'
import mrpReducer from 'state/reducers/mrpReducer.js';
import enquiryNowReducer from 'state/reducers/popularSearchesReducer.js';
import reviewReducer from 'state/reducers/reviewReducer.js';
import publicizeReducer from 'state/reducers/publicizeReducer.js';
import seoPageContentBlogReducer from 'state/reducers/seoPageContentBlogReducer.js';
import authorMasterReducer from 'state/reducers/authorMasterReducer.js';
import termsAndConditionReducer from 'state/reducers/footerContents/termsAndConditionsReducer.js';
import favoriteReducer from 'state/reducers/favoriteReducer.js';
import fcmMarketingReducer from 'state/reducers/fcmMarketingReducer.js';
import systemSettingsReducer from 'state/reducers/systemSettingsReducer.js';
import cacheReducer from 'state/reducers/cacheReducer.js';
import { maintenanceReducer } from 'state/reducers/maintenanceReducer.js';
import categoryDisplaySettingsReducer from 'state/reducers/categoryDisplaySettingsReducer.js';
import globalLoaderReducer from 'state/reducers/globalLoaderReducer.js';
import eventReducer from 'state/reducers/eventReducer.js';
import gmapsLeadsReducer from 'state/reducers/gmapsLeadsReducer.js';
import msg91AnalyticsReducer from 'state/reducers/msg91AnalyticsReducer.js';
import publicUserCounterReducer from 'state/reducers/publicUserCounterReducer.js';
import gscReducer from 'state/reducers/gscReducer.js';
import ga4Reducer from 'state/reducers/ga4Reducer.js';
import quotationReducer from 'state/reducers/quotationReducer.js';
import massclickDocumentsReducer from 'state/reducers/massclickDocumentsReducer.js';
import massclickFeedReducer from 'state/reducers/massclickFeedReducer.js';
import userFeedbackReducer from 'state/reducers/userFeedbackReducer.js';
import searchRequestReducer from 'state/reducers/searchRequestReducer.js';
import massclickEventReducer from 'state/reducers/massclickEventReducer.js';
import legalDocumentsReducer from 'state/reducers/legalDocumentsReducer.js';
import hiringReducer from 'state/reducers/hiringReducer.js';
import supportReducer from 'state/reducers/supportReducer.js';
import businessPersonReportReducer from 'state/reducers/businessPersonReportReducer.js';

const rootReducer = combineReducers({
  auth: authReducer,
  userReducer: userReducer,
  userClientReducer: userClientReducer,
  locationReducer: locationReducer,
  masterLocationReducer: masterLocationReducer,
  categoryReducer: categoryReducer,
  businessListReducer: businessListReducer,
  rolesReducer: rolesReducer,
  enquiryReducer: enquiryReducer,
  startProjectReducer: startProjectReducer,
  otp: otpReducer,
  clientAuth: clientAuthReducer,
  phonepe: phonepeReducer,
  leads: leadsReducer,
  advertisement: advertisementReducer,
  seoReducer,
  seoPageContentReducer,
  seoTemplateReducer,
  seoPageContentBlogReducer,
  authorMasterReducer,
  mrp: mrpReducer,
  enquiryNow: enquiryNowReducer,
  reviews: reviewReducer,
  publicize: publicizeReducer,
  termsAndConditions: termsAndConditionReducer,
  legalDocuments: legalDocumentsReducer,
  hiring: hiringReducer,
  favorites: favoriteReducer,
  fcmMarketing: fcmMarketingReducer,
  systemSettings: systemSettingsReducer,
  cache: cacheReducer,
  maintenance: maintenanceReducer,
  categoryDisplaySettings: categoryDisplaySettingsReducer,
  globalLoader: globalLoaderReducer,
  event: eventReducer,
  gmapsLeadsReducer: gmapsLeadsReducer,
  msg91Analytics: msg91AnalyticsReducer,
  publicUserCounter: publicUserCounterReducer,
  gscReducer,
  ga4Reducer,
  quotationReducer,
  massclickDocuments: massclickDocumentsReducer,
  massclickFeed: massclickFeedReducer,
  userFeedback: userFeedbackReducer,
  searchRequests: searchRequestReducer,
  massclickEvents: massclickEventReducer,
  support: supportReducer,
  businessPersonReport: businessPersonReportReducer,
});

let storeInstance = null;

export const getStore = () => {
  if (!storeInstance) {
    storeInstance = createStore(rootReducer, applyMiddleware(thunk));
  }
  return storeInstance;
};

export const store = createStore(rootReducer, applyMiddleware(thunk));
