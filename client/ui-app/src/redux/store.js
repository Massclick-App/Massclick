import { createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './reducers/authReducer';
import userReducer from './reducers/userReducer';
import userClientReducer from './reducers/userClientReducer'
import locationReducer from './reducers/locationReducer.js'
import categoryReducer from './reducers/categoryReducer.js'
import businessListReducer from './reducers/businessListReducer.js'
import rolesReducer from './reducers/rolesReducer.js';
import enquiryReducer from './reducers/enquiryReducer.js';
import startProjectReducer from './reducers/startProjectReducer.js'
import otpReducer from './reducers/otpReducer.js'
import clientAuthReducer from './reducers/clientAuthReducer.js'
import phonepeReducer from './reducers/phonePayReducer.js';
import leadsReducer from './reducers/leadsReducer.js';
import advertisementReducer from './reducers/advertisementReducer.js';
import seoReducer from './reducers/seoReducer.js';
import seoPageContentReducer from './reducers/seoPageContentReducer.js'
import mrpReducer from './reducers/mrpReducer.js';
import enquiryNowReducer from './reducers/popularSearchesReducer.js';
import reviewReducer from './reducers/reviewReducer.js';
import publicizeReducer from './reducers/publicizeReducer.js';
import seoPageContentBlogReducer from './reducers/seoPageContentBlogReducer.js';
import authorMasterReducer from './reducers/authorMasterReducer.js';
import termsAndConditionReducer from './reducers/footerContents/termsAndConditionsReducer.js';
import favoriteReducer from './reducers/favoriteReducer.js';
import fcmMarketingReducer from './reducers/fcmMarketingReducer.js';
import systemSettingsReducer from './reducers/systemSettingsReducer.js';
import cacheReducer from './reducers/cacheReducer.js';
import { maintenanceReducer } from './reducers/maintenanceReducer.js';
import categoryDisplaySettingsReducer from './reducers/categoryDisplaySettingsReducer.js';
import globalLoaderReducer from './reducers/globalLoaderReducer.js';
import eventReducer from './reducers/eventReducer.js';
import gmapsLeadsReducer from './reducers/gmapsLeadsReducer.js';
import msg91AnalyticsReducer from './reducers/msg91AnalyticsReducer.js';
import publicUserCounterReducer from './reducers/publicUserCounterReducer.js';
import gscReducer from './reducers/gscReducer.js';
import ga4Reducer from './reducers/ga4Reducer.js';
import quotationReducer from './reducers/quotationReducer.js';

const rootReducer = combineReducers({
  auth: authReducer,
  userReducer: userReducer,
  userClientReducer: userClientReducer,
  locationReducer: locationReducer,
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
  seoPageContentBlogReducer,
  authorMasterReducer,
  mrp: mrpReducer,
  enquiryNow: enquiryNowReducer,
  reviews: reviewReducer,
  publicize: publicizeReducer,
  termsAndConditions: termsAndConditionReducer,
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
});

let storeInstance = null;

export const getStore = () => {
  if (!storeInstance) {
    storeInstance = createStore(rootReducer, applyMiddleware(thunk));
  }
  return storeInstance;
};

export const store = createStore(rootReducer, applyMiddleware(thunk));
