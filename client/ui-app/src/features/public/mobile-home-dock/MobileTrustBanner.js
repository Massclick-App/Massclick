import React from "react";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/public/mobile-home-dock/MobileTrustBanner.module.css";

const cx = createScopedClassNames(styles);

const MobileTrustBanner = () => (
  <button type="button" className={cx("banner")} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
    <span className={cx("shield")}><ShieldRoundedIcon /></span>
    <span className={cx("copy")}><strong>Trusted by Thousands</strong><small>Your trusted partner for local search.</small></span>
    <span className={cx("arrow")}><ChevronRightRoundedIcon /></span>
  </button>
);

export default MobileTrustBanner;
