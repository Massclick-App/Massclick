import { useState } from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import axiosInstance from "../../../../services/axiosInstance";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import Footer from "../footer";
import SeoMeta from "../../seo/seoMeta";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import styles from "./deleteAccount.module.css";

const cx = createScopedClassNames(styles);
const SUPPORT_EMAIL = "support@massclick.in";

const fallbackSeo = {
  title: "Delete your Massclick account",
  description:
    "Request deletion of your Massclick account and associated personal data after verifying your mobile number.",
  keywords: "Massclick account deletion, delete Massclick data",
  canonical: "https://massclick.in/deleteaccount",
  robots: "index, follow",
};

const normalizeMobile = (value) => String(value || "").replace(/\D/g, "");

const getErrorMessage = (error, fallback) => {
  const status = error?.response?.status;
  if (status === 429) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (status === 400 || status === 401) {
    return error?.response?.data?.message || "The verification code is incorrect.";
  }
  return error?.response?.data?.message || fallback;
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const DeleteAccount = () => {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [request, setRequest] = useState(null);

  const resetFlow = () => {
    setStep("phone");
    setPhone("");
    setOtp("");
    setVerificationToken("");
    setConfirmed(false);
    setError("");
    setRequest(null);
  };

  const handleSendOtp = async (event) => {
    event.preventDefault();
    const mobile = normalizeMobile(phone);

    if (!/^\d{10}$/.test(mobile)) {
      setError("Enter the 10-digit mobile number linked to your account.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.post("/otp_user/send-otp", {
        phoneNumber: mobile,
      });

      if (response.data?.isNewUser) {
        setError(
          "We could not find a Massclick account linked to this mobile number."
        );
        return;
      }

      setPhone(mobile);
      setStep("otp");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "We could not send the verification code. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    if (!/^\d{4}$/.test(otp)) {
      setError("Enter the 4-digit verification code.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.post("/otp_user/verify-otp", {
        phoneNumber: phone,
        otp,
        userName: "",
      });
      const token = response.data?.token;

      if (!token) {
        throw new Error("Verification token was not returned.");
      }

      setVerificationToken(token);
      setOtp("");
      setStep("confirm");
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "We could not verify this code. Please request a new code."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeletionRequest = async (event) => {
    event.preventDefault();
    if (!confirmed || !verificationToken) return;

    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.post(
        "/account-deletion/request",
        { source: "web_external" },
        {
          headers: {
            Authorization: `Bearer ${verificationToken}`,
          },
        }
      );

      setRequest(response.data);
      setVerificationToken("");
      setStep("done");
    } catch (requestError) {
      if (requestError?.response?.status === 401) {
        setVerificationToken("");
        setStep("phone");
        setConfirmed(false);
        setError("Your verification expired. Please verify your number again.");
      } else {
        setError(
          getErrorMessage(
            requestError,
            "We could not submit your request. Please try again."
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    if (step === "done") {
      return (
        <div className={cx("success-panel")} role="status">
          <CheckCircleRoundedIcon className={cx("success-icon")} />
          <p className={cx("eyebrow")}>Request received</p>
          <h2 className={cx("form-title")}>We are processing your deletion</h2>
          <p className={cx("form-description")}>
            Your verified request has been recorded. Massclick will process it
            by {formatDate(request?.expectedCompletionAt)}.
          </p>
          <div className={cx("reference-box")}>
            <span className={cx("reference-label")}>Request reference</span>
            <strong className={cx("reference-value")}>
              {request?.requestId}
            </strong>
          </div>
          <p className={cx("support-note")}>
            Save this reference. For help, email{" "}
            <a className={cx("text-link")} href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <button className={cx("secondary-button")} onClick={resetFlow}>
            Submit another request
          </button>
        </div>
      );
    }

    if (step === "otp") {
      return (
        <form className={cx("request-form")} onSubmit={handleVerifyOtp}>
          <div className={cx("form-icon")}>
            <VerifiedUserRoundedIcon />
          </div>
          <p className={cx("eyebrow")}>Step 2 of 3</p>
          <h2 className={cx("form-title")}>Verify your mobile number</h2>
          <p className={cx("form-description")}>
            Enter the 4-digit OTP sent to +91 {phone}. This confirms that the
            account belongs to you.
          </p>
          <label className={cx("field-label")} htmlFor="deletion-otp">
            Verification code
          </label>
          <input
            className={cx("text-input otp-input")}
            id="deletion-otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={otp}
            onChange={(event) => {
              setOtp(normalizeMobile(event.target.value).slice(0, 4));
              setError("");
            }}
            placeholder="0000"
            autoFocus
          />
          {error && (
            <p className={cx("form-error")} role="alert">
              {error}
            </p>
          )}
          <button
            className={cx("primary-button")}
            type="submit"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify code"}
          </button>
          <button
            className={cx("text-button")}
            type="button"
            onClick={() => {
              setStep("phone");
              setOtp("");
              setError("");
            }}
          >
            Use a different number
          </button>
        </form>
      );
    }

    if (step === "confirm") {
      return (
        <form className={cx("request-form")} onSubmit={handleDeletionRequest}>
          <div className={cx("form-icon danger-icon")}>
            <DeleteForeverRoundedIcon />
          </div>
          <p className={cx("eyebrow")}>Step 3 of 3</p>
          <h2 className={cx("form-title")}>Confirm permanent deletion</h2>
          <p className={cx("form-description")}>
            This request cannot be undone after processing. You will lose access
            to your profile and associated account activity.
          </p>
          <label className={cx("confirmation-row")} htmlFor="confirm-deletion">
            <input
              className={cx("confirmation-checkbox")}
              id="confirm-deletion"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked);
                setError("");
              }}
            />
            <span className={cx("confirmation-copy")}>
              I understand that my Massclick account and associated personal
              data will be permanently deleted.
            </span>
          </label>
          {error && (
            <p className={cx("form-error")} role="alert">
              {error}
            </p>
          )}
          <button
            className={cx("danger-button")}
            type="submit"
            disabled={!confirmed || loading}
          >
            {loading ? "Submitting..." : "Submit deletion request"}
          </button>
          <button
            className={cx("text-button")}
            type="button"
            onClick={resetFlow}
          >
            Cancel
          </button>
        </form>
      );
    }

    return (
      <form className={cx("request-form")} onSubmit={handleSendOtp}>
        <div className={cx("form-icon")}>
          <PhoneIphoneRoundedIcon />
        </div>
        <p className={cx("eyebrow")}>Step 1 of 3</p>
        <h2 className={cx("form-title")}>Find your Massclick account</h2>
        <p className={cx("form-description")}>
          Use the same Indian mobile number you use to sign in to Massclick. We
          will send an OTP to verify ownership.
        </p>
        <label className={cx("field-label")} htmlFor="deletion-mobile">
          Mobile number
        </label>
        <div className={cx("phone-field")}>
          <span className={cx("country-code")}>+91</span>
          <input
            className={cx("phone-input")}
            id="deletion-mobile"
            name="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={10}
            value={phone}
            onChange={(event) => {
              setPhone(normalizeMobile(event.target.value).slice(0, 10));
              setError("");
            }}
            placeholder="98765 43210"
          />
        </div>
        {error && (
          <p className={cx("form-error")} role="alert">
            {error}
          </p>
        )}
        <button
          className={cx("primary-button")}
          type="submit"
          disabled={loading}
        >
          {loading ? "Sending OTP..." : "Send verification code"}
        </button>
      </form>
    );
  };

  return (
    <>
      <SeoMeta seoData={null} fallback={fallbackSeo} />
      <StickySearchBar />
      <main className={cx("delete-page")}>
        <section className={cx("hero-section")}>
          <div className={cx("hero-copy")}>
            <span className={cx("policy-badge")}>
              <LockRoundedIcon className={cx("badge-icon")} />
              Official Massclick account request
            </span>
            <h1 className={cx("page-title")}>Delete your Massclick account</h1>
            <p className={cx("page-intro")}>
              Request permanent deletion of your account and associated
              personal data. You do not need to reinstall or open the mobile
              app to complete this request.
            </p>
          </div>
          <div className={cx("timeline-card")}>
            <ScheduleRoundedIcon className={cx("timeline-icon")} />
            <div className={cx("timeline-copy")}>
              <strong className={cx("timeline-title")}>
                Processed within 7 days
              </strong>
              <span className={cx("timeline-text")}>
                We verify ownership by OTP before accepting a request.
              </span>
            </div>
          </div>
        </section>

        <section className={cx("content-grid")}>
          <div className={cx("form-card")}>{renderForm()}</div>

          <aside className={cx("information-column")}>
            <section className={cx("information-card")}>
              <h2 className={cx("information-title")}>Data we delete</h2>
              <ul className={cx("data-list")}>
                <li className={cx("data-item")}>
                  Account profile, name, phone, email and saved addresses
                </li>
                <li className={cx("data-item")}>
                  Favorites, search history and account preferences
                </li>
                <li className={cx("data-item")}>
                  Reviews, feedback, feed activity and notification tokens
                </li>
                <li className={cx("data-item")}>
                  Personal links between your account and business listings
                </li>
              </ul>
            </section>

            <section className={cx("information-card")}>
              <h2 className={cx("information-title")}>
                Limited data we may retain
              </h2>
              <p className={cx("information-text")}>
                A minimal deletion-request record and residual encrypted backup
                copies may be retained for up to 90 days, then deleted through
                normal secure rotation.
              </p>
              <p className={cx("information-text")}>
                Payment, invoice and tax records may be retained for up to eight
                financial years, or longer when required for an active legal,
                tax, fraud-prevention or regulatory matter. Retained records are
                access-restricted and are not used for marketing.
              </p>
            </section>

            <section className={cx("help-card")}>
              <h2 className={cx("help-title")}>Need help?</h2>
              <p className={cx("help-text")}>
                Contact{" "}
                <a
                  className={cx("text-link")}
                  href={`mailto:${SUPPORT_EMAIL}`}
                >
                  {SUPPORT_EMAIL}
                </a>
                . Include your mobile number and request reference if you have
                already submitted the form.
              </p>
            </section>
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default DeleteAccount;
