import React, { useEffect, useMemo, useState } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useDispatch, useSelector } from "react-redux";
import {
  createSearchRequest,
  initializeSearchRequestForm,
  setSearchRequestField,
} from "state/actions/searchRequestAction.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { normalizeIndianMobile, toMobileInputValue } from "shared/utils/indianMobile.js";
import styles from "features/public/search-results/SearchResult.module.css";

const cx = createScopedClassNames(styles);
const namePattern = /^\p{L}[\p{L}\p{M} .'-]*$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hasLetter = /\p{L}/u;
const singleLine = (value) => String(value || "").trim().replace(/\s+/g, " ");

// Keep in step with validationError in server/controller/searchRequest/searchRequestController.js.
// Upper length limits are enforced by the inputs' maxLength.
const fieldRules = {
  fullName: (value) => {
    const name = singleLine(value);
    if (name.length < 2) return "Enter your name (at least 2 letters).";
    return namePattern.test(name) ? "" : "Use letters, spaces, dots, apostrophes or hyphens only.";
  },
  contactNumber: (value) => normalizeIndianMobile(value) ? "" : "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.",
  email: (value) => emailPattern.test(singleLine(value)) ? "" : "Enter a valid email address, e.g. you@example.com.",
  category: (value) => {
    const category = singleLine(value);
    return category.length >= 2 && hasLetter.test(category) ? "" : "Enter the category you need.";
  },
  location: (value) => singleLine(value).length >= 2 ? "" : "Enter an area, city or landmark.",
  details: (value) => {
    const details = String(value || "").trim();
    if (details.length < 10) return `Add a little more detail (${details.length}/10 characters).`;
    return hasLetter.test(details) ? "" : "Describe what you need in words.";
  },
};
const fieldOrder = Object.keys(fieldRules);
const validate = (form) => fieldOrder.reduce((errors, field) => {
  const message = fieldRules[field](form[field]);
  return message ? { ...errors, [field]: message } : errors;
}, {});

const getSavedUser = () => {
  try { return JSON.parse(localStorage.getItem("authUser") || "null") || {}; }
  catch { return {}; }
};

const buildInitialValues = (category, location) => {
  const user = getSavedUser();
  const savedName = String(user.userName || user.name || "");
  return {
    // Accounts created before the owner typed a name carry a "User_<mobile>" placeholder.
    fullName: /^User_\d+$/.test(savedName.trim()) ? "" : savedName,
    contactNumber: toMobileInputValue(user.mobileNumber1 || user.mobileNumber2 || ""),
    email: user.email || "",
    category: category || "",
    location: location || "",
    details: "",
  };
};

const NoResultsRequestForm = ({ category, location, onClearFilters }) => {
  const dispatch = useDispatch();
  const { form, submitting, error, lastSubmitted } = useSelector((state) => state.searchRequests);
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const errors = useMemo(() => validate(form), [form]);

  useEffect(() => {
    dispatch(initializeSearchRequestForm(buildInitialValues(category, location)));
    setTouched({});
    setSubmitAttempted(false);
  }, [category, location, dispatch]);

  const handleChange = ({ target: { name, value } }) => {
    dispatch(setSearchRequestField(name, name === "contactNumber" ? toMobileInputValue(value) : value));
  };
  const handleBlur = ({ target: { name } }) => setTouched((current) => ({ ...current, [name]: true }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const firstInvalid = fieldOrder.find((field) => errors[field]);
    if (firstInvalid) {
      event.currentTarget.elements.namedItem(firstInvalid)?.focus();
      return;
    }
    try {
      await dispatch(createSearchRequest({
        ...form,
        fullName: singleLine(form.fullName),
        contactNumber: normalizeIndianMobile(form.contactNumber),
        email: singleLine(form.email).toLowerCase(),
        category: singleLine(form.category),
        location: singleLine(form.location),
        details: String(form.details || "").trim(),
        source: "search-no-results",
      }));
    }
    catch {
      // The thunk stores the API error in Redux for the alert below.
    }
  };
  const errorMessage = error?.message || (typeof error === "string" ? error : "");

  const visibleError = (field) => (touched[field] || submitAttempted ? errors[field] : "");
  const fieldProps = (field) => ({
    name: field,
    value: form[field] ?? "",
    onChange: handleChange,
    onBlur: handleBlur,
    "aria-invalid": Boolean(visibleError(field)),
    "aria-describedby": visibleError(field) ? `search-request-${field}-error` : undefined,
  });
  const fieldError = (field) => visibleError(field) && <small id={`search-request-${field}-error`} className={cx("request-field-error")}>{visibleError(field)}</small>;

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
        <form className={cx("request-form")} onSubmit={handleSubmit} noValidate>
          <label className={cx("request-field")}><span>Your name *</span><input {...fieldProps("fullName")} placeholder="Enter your full name" autoComplete="name" maxLength={100} required />{fieldError("fullName")}</label>
          <label className={cx("request-field")}><span>Mobile number *</span><div className={cx("request-input-icon", "request-input-icon--prefix")}><span className={cx("request-input-prefix")} aria-hidden="true">+91</span><input {...fieldProps("contactNumber")} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" required /></div>{fieldError("contactNumber")}</label>
          <label className={cx("request-field")}><span>Email address *</span><input {...fieldProps("email")} type="email" autoComplete="email" placeholder="you@example.com" maxLength={150} required />{fieldError("email")}</label>
          <label className={cx("request-field")}><span>Needed category *</span><input {...fieldProps("category")} placeholder="e.g. Restaurants" maxLength={120} required />{fieldError("category")}</label>
          <label className={cx("request-field", "request-field--location")}><span>Preferred location *</span><div className={cx("request-input-icon")}><LocationOnOutlinedIcon /><input {...fieldProps("location")} placeholder="Area, city or landmark" maxLength={180} required /></div>{fieldError("location")}</label>
          <label className={cx("request-field", "request-field--wide")}><span>Tell us what you need *</span><textarea {...fieldProps("details")} placeholder="Add requirements, preferred time, budget or other useful details..." rows="3" maxLength={2000} required />{fieldError("details")}</label>
          <div className={cx("request-form-footer")}><p>By submitting, you agree to be contacted about this request.</p><div className={cx("request-actions")}>{onClearFilters && <button type="button" className={cx("request-clear-button")} onClick={onClearFilters}>Clear filters</button>}<button type="submit" className={cx("request-submit-button")} disabled={submitting}>{submitting ? "Sending..." : <><SendRoundedIcon /> Send request</>}</button></div></div>
        </form>
      )}
    </section>
  );
};

export default NoResultsRequestForm;
