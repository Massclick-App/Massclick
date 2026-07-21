import React, { useEffect } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useDispatch, useSelector } from "react-redux";
import {
  createSearchRequest,
  initializeSearchRequestForm,
  setSearchRequestField,
} from "../../../redux/actions/searchRequestAction.js";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./SearchResult.module.css";

const cx = createScopedClassNames(styles);
const getSavedUser = () => {
  try { return JSON.parse(localStorage.getItem("authUser") || "null") || {}; }
  catch { return {}; }
};

const buildInitialValues = (category, location) => {
  const user = getSavedUser();
  return {
    fullName: user.userName || user.name || "",
    contactNumber: user.mobileNumber1 || user.mobileNumber2 || "",
    email: user.email || "",
    category: category || "",
    location: location || "",
    details: "",
  };
};

const NoResultsRequestForm = ({ category, location, onClearFilters }) => {
  const dispatch = useDispatch();
  const { form, submitting, error, lastSubmitted } = useSelector((state) => state.searchRequests);

  useEffect(() => {
    dispatch(initializeSearchRequestForm(buildInitialValues(category, location)));
  }, [category, location, dispatch]);

  const handleChange = ({ target: { name, value } }) => dispatch(setSearchRequestField(name, value));
  const handleSubmit = async (event) => {
    event.preventDefault();
    try { await dispatch(createSearchRequest({ ...form, source: "search-no-results" })); }
    catch {
      // The thunk stores the API error in Redux for the alert below.
    }
  };
  const errorMessage = error?.message || (typeof error === "string" ? error : "");

  return (
    <section className={cx("request-card")} aria-labelledby="request-form-title">
      <div className={cx("request-card-intro")}>
        <span className={cx("request-icon")}><SearchOffRoundedIcon /></span>
        <div>
          <span className={cx("request-eyebrow")}>We’ll help you find it</span>
          <h2 id="request-form-title">Can’t find what you need?</h2>
          <p>Share a few details and our team will connect you with suitable {category}{location ? ` in ${location}` : ""}.</p>
        </div>
      </div>
      {lastSubmitted && <div className={cx("request-alert", "request-alert--success")} role="status"><CheckCircleIcon /><span>Your request has been sent. We’ll help you find the right business soon.</span></div>}
      {errorMessage && <div className={cx("request-alert", "request-alert--error")} role="alert"><span>{errorMessage}</span></div>}
      {!lastSubmitted && (
        <form className={cx("request-form")} onSubmit={handleSubmit}>
          <label className={cx("request-field")}><span>Your name *</span><input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" required /></label>
          <label className={cx("request-field")}><span>Mobile number *</span><input type="tel" name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="10-digit mobile number" pattern="[0-9+() -]{7,15}" required /></label>
          <label className={cx("request-field")}><span>Email address *</span><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required /></label>
          <label className={cx("request-field")}><span>Needed category *</span><input name="category" value={form.category} onChange={handleChange} placeholder="e.g. Restaurants" required /></label>
          <label className={cx("request-field", "request-field--location")}><span>Preferred location *</span><div className={cx("request-input-icon")}><LocationOnOutlinedIcon /><input name="location" value={form.location} onChange={handleChange} placeholder="Area, city or landmark" required /></div></label>
          <label className={cx("request-field", "request-field--wide")}><span>Tell us what you need *</span><textarea name="details" value={form.details} onChange={handleChange} placeholder="Add requirements, preferred time, budget or other useful details..." rows="3" minLength="10" required /></label>
          <div className={cx("request-form-footer")}><p>By submitting, you agree to be contacted about this request.</p><div className={cx("request-actions")}>{onClearFilters && <button type="button" className={cx("request-clear-button")} onClick={onClearFilters}>Clear filters</button>}<button type="submit" className={cx("request-submit-button")} disabled={submitting}>{submitting ? "Sending..." : <><SendRoundedIcon /> Send request</>}</button></div></div>
        </form>
      )}
    </section>
  );
};

export default NoResultsRequestForm;
