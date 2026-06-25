import React from "react";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Building2, ShieldCheck, Users } from "lucide-react";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import styles from "./TwoWayAwareness.module.css";

const cx = createScopedClassNames(styles);
const WHATSAPP_PHONE_NUMBER = "917358673203";
const WHATSAPP_MESSAGE = "Yes";
const ENCODED_WHATSAPP_MESSAGE = encodeURIComponent(WHATSAPP_MESSAGE);
const WHATSAPP_URL =
  `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${ENCODED_WHATSAPP_MESSAGE}`;
const WHATSAPP_BUSINESS_URL =
  `intent://send/?phone=${WHATSAPP_PHONE_NUMBER}&text=${ENCODED_WHATSAPP_MESSAGE}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;

const TwoWayAwareness = ({ isLoggedIn = false, onLoginRequest }) => {
  return (
    <section className={cx("two-way-awareness")} aria-label="Verified two-way lead awareness">
      <div className={cx("awareness-copy")}>
        <span className={cx("awareness-label")}>
          Verified two-way lead awareness
        </span>
        <strong className={cx("awareness-title")}>
          One login connects customers and businesses with clearer WhatsApp follow-up.
        </strong>
        <span className={cx("awareness-description")}>
          This reminder explains the complete flow: customers get relevant
          business options, business owners receive verified enquiries, and both
          sides stay connected through a mobile-confirmed WhatsApp path.
        </span>

        <div className={cx("awareness-grid")}>
          <div className={cx("awareness-card")}>
            <Users size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>Customers discover suitable businesses after mobile login.</span>
          </div>
          <div className={cx("awareness-card")}>
            <Building2 size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>Business owners receive cleaner leads with contact context.</span>
          </div>
          <div className={cx("awareness-card")}>
            <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>Verified mobile access reduces missed or unclear enquiries.</span>
          </div>
        </div>
      </div>

      <div className={cx("awareness-actions")}>
        <a
          className={cx("phone-link")}
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open MassClick WhatsApp chat with 7358673203"
        >
          <WhatsAppIcon />
          <span>7358673203</span>
        </a>
        {isLoggedIn ? (
          <>
            <a
              className={cx("whatsapp-action")}
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Yes, open WhatsApp
              <ArrowForwardIcon />
            </a>
            <a
              className={cx("whatsapp-action")}
              href={WHATSAPP_BUSINESS_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open MassClick WhatsApp Business chat with 7358673203"
            >
              Open Business WhatsApp
              <ArrowForwardIcon />
            </a>
          </>
        ) : (
          <button
            type="button"
            className={cx("whatsapp-action")}
            onClick={onLoginRequest}
          >
            Login with mobile
            <ArrowForwardIcon />
          </button>
        )}
      </div>
    </section>
  );
};

export default React.memo(TwoWayAwareness);
