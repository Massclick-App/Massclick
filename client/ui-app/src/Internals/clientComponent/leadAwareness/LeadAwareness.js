import React from "react";
import {
  CheckCircle2,
  LogIn,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./LeadAwareness.module.css";

const cx = createScopedClassNames(styles);
const WHATSAPP_PHONE_NUMBER = "917358673203";
const WHATSAPP_MESSAGE = "Yes";
const ENCODED_WHATSAPP_MESSAGE = encodeURIComponent(WHATSAPP_MESSAGE);
const WHATSAPP_CHAT_URL =
  `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${ENCODED_WHATSAPP_MESSAGE}`;
const WHATSAPP_BUSINESS_CHAT_URL =
  `intent://send/?phone=${WHATSAPP_PHONE_NUMBER}&text=${ENCODED_WHATSAPP_MESSAGE}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;

const LeadAwareness = ({
  isLoggedIn = false,
  onLoginRequest,
  emphasizeLogin = false,
}) => {
  return (
    <aside
      className={cx(
        "lead-awareness",
        emphasizeLogin && !isLoggedIn && "lead-awareness--reminder",
      )}
      aria-label="MassClick WhatsApp leads announcement"
    >
      <div className={cx("message-group")}>
        <span className={cx("announcement-icon")} aria-hidden="true">
          <Sparkles size={20} strokeWidth={2.1} />
        </span>

        <div className={cx("message-copy")}>
          <span className={cx("message-label")}>Customer and business matching</span>
          <strong className={cx("message-title")}>
            {isLoggedIn
              ? "Your verified mobile is ready for WhatsApp lead matching."
              : "Login once to unlock verified WhatsApp lead matching."}
          </strong>
          <p className={cx("message-description")}>
            MassClick uses your verified mobile number to route enquiries clearly:
            customers receive suitable business options, and businesses receive
            relevant customer interest.
          </p>
          <div className={cx("audience-points")}>
            <span className={cx("audience-point")}>
              <Search size={15} strokeWidth={2.2} aria-hidden="true" />
              Customers see trusted options after login.
            </span>
            <span className={cx("audience-point")}>
              <Store size={15} strokeWidth={2.2} aria-hidden="true" />
              Businesses receive cleaner, verified leads.
            </span>
            <span className={cx("audience-point")}>
              <ShieldCheck size={15} strokeWidth={2.2} aria-hidden="true" />
              Login keeps the connection transparent.
            </span>
          </div>
        </div>
      </div>

      <div className={cx("contact-group")}>
        <a
          className={cx("phone-chat-link")}
          href={WHATSAPP_CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open MassClick WhatsApp chat with 7358673203"
        >
          <MessageCircle size={17} strokeWidth={2.3} aria-hidden="true" />
          <span>7358673203</span>
        </a>
        {isLoggedIn ? (
          <>
            <a
              className={cx("active-status")}
              href={WHATSAPP_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CheckCircle2 size={20} strokeWidth={2.2} aria-hidden="true" />
              Yes, open WhatsApp
            </a>
            <a
              className={cx("active-status")}
              href={WHATSAPP_BUSINESS_CHAT_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open MassClick WhatsApp Business chat with 7358673203"
            >
              <MessageCircle size={17} strokeWidth={2.3} aria-hidden="true" />
              Open Business WhatsApp
            </a>
          </>
        ) : (
          <button
            type="button"
            className={cx("login-action")}
            onClick={onLoginRequest}
          >
            <span className={cx("login-action-icons")} aria-hidden="true">
              <LogIn size={17} strokeWidth={2.3} />
              <MessageCircle size={17} strokeWidth={2.3} />
            </span>
            Login with mobile
          </button>
        )}
      </div>
    </aside>
  );
};

export default React.memo(LeadAwareness);
