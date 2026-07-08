import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SentimentSatisfiedAltRoundedIcon from "@mui/icons-material/SentimentSatisfiedAltRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useNavigate } from "react-router-dom";
import { createUserFeedback } from "../../../../redux/actions/userFeedbackAction.js";
import styles from "./FeedBackPage.module.css";

const cx = createScopedClassNames(styles);

const feedbackTypes = [
  "Search results quality",
  "Business information accuracy",
  "Local discovery experience",
  "Account or dashboard experience",
  "Trust, safety, or policy",
  "Other feedback",
];

const improvementAreas = [
  "More accurate business data",
  "Faster local search",
  "Better filters and categories",
  "Verified reviews",
  "Map and location accuracy",
  "Cleaner mobile experience",
];

const qualitySignals = [
  {
    icon: ManageSearchRoundedIcon,
    title: "Search relevance",
    text: "Help us tune local results by area, category, intent, and freshness.",
  },
  {
    icon: VerifiedRoundedIcon,
    title: "Verified local data",
    text: "Report inaccurate listings, outdated contacts, or missing business proof.",
  },
  {
    icon: SecurityRoundedIcon,
    title: "Trust and safety",
    text: "Flag suspicious content, spam, poor support, or policy concerns.",
  },
];

const standards = [
  "Reviewed by product and customer support teams",
  "Personal data used only for follow-up and service quality",
  "High-impact issues are routed with priority context",
];

const initialForm = {
  rating: 5,
  type: feedbackTypes[0],
  journey: "I searched for a local business or service",
  message: "",
  area: improvementAreas[0],
  name: "",
  email: "",
  allowContact: true,
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

export default function FeedbackPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { submitting, error } = useSelector((state) => state.userFeedback || {});
  const storedUser = useMemo(() => getStoredUser(), []);
  const [form, setForm] = useState({
    ...initialForm,
    name: storedUser.userName || storedUser.name || "",
    email: storedUser.email || storedUser.userEmail || "",
  });
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field, value) => {
    setSubmitted(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await dispatch(createUserFeedback(form));
      setSubmitted(true);
      setForm((current) => ({
        ...initialForm,
        name: current.name,
        email: current.email,
        allowContact: current.allowContact,
      }));
    } catch {
      setSubmitted(false);
    }
  };

  return (
    <main className={cx("feedback-page")}>
      <div className={cx("page-topbar")}>
        <button
          className={cx("back-button")}
          type="button"
          onClick={() => navigate("/")}
        >
          <ArrowBackRoundedIcon className={cx("button-icon")} />
          Back to dashboard
        </button>
        <span className={cx("page-label")}>User feedback</span>
      </div>

      <section className={cx("feedback-hero")}>
        <div className={cx("hero-content")}>
          <span className={cx("eyebrow")}>MassClick quality program</span>
          <h1 className={cx("hero-title")}>
            Help improve local search for every city, category, and customer.
          </h1>
          <p className={cx("hero-copy")}>
            Share precise feedback about search results, business listings,
            support, trust, or dashboard usability. Your input helps MassClick
            build a faster, cleaner, and more reliable local search engine.
          </p>

          <div className={cx("hero-stats")}>
            <div className={cx("hero-stat")}>
              <strong className={cx("hero-stat-value")}>24h</strong>
              <span className={cx("hero-stat-label")}>Priority issue triage</span>
            </div>
            <div className={cx("hero-stat")}>
              <strong className={cx("hero-stat-value")}>Global</strong>
              <span className={cx("hero-stat-label")}>Product quality standard</span>
            </div>
            <div className={cx("hero-stat")}>
              <strong className={cx("hero-stat-value")}>Secure</strong>
              <span className={cx("hero-stat-label")}>Responsible data handling</span>
            </div>
          </div>
        </div>

        <aside className={cx("hero-panel")} aria-label="Feedback promise">
          <PublicRoundedIcon className={cx("hero-panel-icon")} />
          <span className={cx("panel-label panel-label-light")}>
            International standard
          </span>
          <h2 className={cx("panel-title")}>
            Built for accurate local discovery at scale.
          </h2>
          <p className={cx("panel-copy")}>
            Clear ratings, structured categories, and actionable comments help
            our team identify product gaps faster.
          </p>
        </aside>
      </section>

      <section className={cx("feedback-shell")}>
        <div className={cx("feedback-form-card")}>
          <div className={cx("section-heading")}>
            <span className={cx("eyebrow")}>Submit feedback</span>
            <h2 className={cx("section-title")}>Tell us what should improve</h2>
            <p className={cx("section-copy")}>
              Include the location, business name, search term, or screen where
              you noticed the issue when possible.
            </p>
          </div>

          {submitted && (
            <div className={cx("success-alert")} role="status">
              <CheckCircleRoundedIcon className={cx("success-icon")} />
              <span>
                Feedback captured. Thank you for helping improve MassClick.
              </span>
            </div>
          )}

          {error?.message && (
            <div className={cx("error-alert")} role="alert">
              <span>{error.message}</span>
            </div>
          )}

          <form className={cx("feedback-form")} onSubmit={handleSubmit}>
            <div className={cx("form-group")}>
              <label className={cx("form-label")}>Overall experience</label>
              <div className={cx("rating-group")} aria-label="Rating out of 5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    className={cx(
                      `rating-button ${form.rating >= rating ? "rating-button-active" : ""}`,
                    )}
                    type="button"
                    key={rating}
                    onClick={() => updateField("rating", rating)}
                    aria-label={`${rating} star rating`}
                  >
                    <StarRoundedIcon />
                  </button>
                ))}
              </div>
            </div>

            <div className={cx("form-grid")}>
              <div className={cx("form-group")}>
                <label className={cx("form-label")} htmlFor="feedbackType">
                  Feedback category
                </label>
                <select
                  className={cx("form-control")}
                  id="feedbackType"
                  value={form.type}
                  onChange={(event) => updateField("type", event.target.value)}
                >
                  {feedbackTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className={cx("form-group")}>
                <label className={cx("form-label")} htmlFor="feedbackArea">
                  Most important improvement
                </label>
                <select
                  className={cx("form-control")}
                  id="feedbackArea"
                  value={form.area}
                  onChange={(event) => updateField("area", event.target.value)}
                >
                  {improvementAreas.map((area) => (
                    <option key={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={cx("form-group")}>
              <label className={cx("form-label")} htmlFor="journey">
                What were you trying to do?
              </label>
              <input
                className={cx("form-control")}
                id="journey"
                type="text"
                value={form.journey}
                onChange={(event) => updateField("journey", event.target.value)}
                placeholder="Example: find a verified electrician near Anna Nagar"
              />
            </div>

            <div className={cx("form-group")}>
              <label className={cx("form-label")} htmlFor="message">
                Your feedback
              </label>
              <textarea
                className={cx("form-control form-textarea")}
                id="message"
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Tell us what happened, what you expected, and what would make the experience better."
                rows={6}
                required
              />
            </div>

            <div className={cx("form-grid")}>
              <div className={cx("form-group")}>
                <label className={cx("form-label")} htmlFor="name">
                  Name
                </label>
                <input
                  className={cx("form-control")}
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className={cx("form-group")}>
                <label className={cx("form-label")} htmlFor="email">
                  Email
                </label>
                <input
                  className={cx("form-control")}
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <label className={cx("checkbox-row")}>
              <input
                className={cx("checkbox-input")}
                type="checkbox"
                checked={form.allowContact}
                onChange={(event) =>
                  updateField("allowContact", event.target.checked)
                }
              />
              <span>MassClick may contact me if more details are needed.</span>
            </label>

            <div className={cx("form-actions")}>
              <button
                className={cx("submit-button")}
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit feedback"}
              </button>
              <p className={cx("form-note")}>
                For urgent support, use Customer Service from the dashboard menu.
              </p>
            </div>
          </form>
        </div>

        <aside className={cx("insights-column")}>
          <div className={cx("insight-card insight-card-dark")}>
            <LanguageRoundedIcon className={cx("insight-icon")} />
            <span className={cx("panel-label panel-label-light")}>
              What great feedback includes
            </span>
            <h3 className={cx("insight-title")}>
              Search term, location, listing, and expected result.
            </h3>
            <p className={cx("insight-copy insight-copy-light")}>
              Specific context lets the product team reproduce the issue and
              improve ranking, category matching, and listing accuracy.
            </p>
          </div>

          <div className={cx("quality-grid")}>
            {qualitySignals.map((item) => {
              const Icon = item.icon;
              return (
                <article className={cx("quality-card")} key={item.title}>
                  <Icon className={cx("quality-icon")} />
                  <h3 className={cx("quality-title")}>{item.title}</h3>
                  <p className={cx("quality-copy")}>{item.text}</p>
                </article>
              );
            })}
          </div>

          <div className={cx("standards-card")}>
            <div className={cx("standards-header")}>
              <SupportAgentRoundedIcon className={cx("standards-icon")} />
              <div>
                <span className={cx("panel-label")}>Review process</span>
                <h3 className={cx("standards-title")}>
                  Handled with product discipline
                </h3>
              </div>
            </div>
            <ul className={cx("standards-list")}>
              {standards.map((standard) => (
                <li className={cx("standard-item")} key={standard}>
                  <SentimentSatisfiedAltRoundedIcon className={cx("standard-icon")} />
                  <span className={cx("standard-text")}>{standard}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
