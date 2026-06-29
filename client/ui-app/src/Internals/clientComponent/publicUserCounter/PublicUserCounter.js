import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import { fetchPublicUserCounter } from "../../../redux/actions/publicUserCounterAction.js";
import {
  formatCounterCount,
  getVisibleCounterCount,
} from "../../../utils/publicUserCounterUtils.js";
import styles from "./PublicUserCounter.module.css";

const cx = createScopedClassNames(styles);

const DigitalNumber = ({ value, size = "large" }) => {
  const text = String(value);
  if (size !== "large") {
    return <span className={cx("public-counter__digital-text")}>{text}</span>;
  }

  return (
    <span className={cx("public-counter__digits", `public-counter__digits--${size}`)} aria-label={text}>
      {text.split("").map((char, index) => (
        <span
          className={cx(
            char === "," ? "public-counter__digit-separator" : "public-counter__digit",
            char === "+" ? "public-counter__digit-plus" : ""
          )}
          key={`${char}-${index}-${text.length}`}
        >
          {char}
        </span>
      ))}
    </span>
  );
};

const PublicUserCounter = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.publicUserCounter?.publicSettings);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    dispatch(fetchPublicUserCounter()).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(() => {
    if (!settings) return null;
    return {
      total: getVisibleCounterCount(settings, now),
    };
  }, [settings, now]);

  if (!settings?.enabled || !counts) return null;

  return (
    <section className={cx("public-counter")} aria-label="Live public users count">
      <div className={cx("public-counter__main")}>
        <div className={cx("public-counter__icon")}>
          <GroupsRoundedIcon />
        </div>

        <div className={cx("public-counter__summary")}>
          <div className={cx("public-counter__eyebrow")}>{settings.title || "Public Users"}</div>
          <div className={cx("public-counter__number")}>
            <DigitalNumber value={`${formatCounterCount(counts.total)}+`} />
          </div>
          <div className={cx("public-counter__subtitle")}>{settings.subtitle || "Public Users Connected"}</div>
          <div className={cx("public-counter__live")}>
            <span className={cx("public-counter__live-dot")} />
            Live Count
          </div>
        </div>

        <div className={cx("public-counter__metrics")}>
          <div className={cx("public-counter__metric")}>
            <TrendingUpRoundedIcon />
            <div>
              <strong><DigitalNumber value={`+${formatCounterCount(settings.todayBaseCount)}`} size="small" /></strong>
              <span>New Users Today</span>
            </div>
          </div>
          <div className={cx("public-counter__metric")}>
            <GroupsRoundedIcon />
            <div>
              <strong><DigitalNumber value={formatCounterCount(settings.onlineBaseCount)} size="small" /></strong>
              <span>Users Online Now</span>
            </div>
          </div>
          <div className={cx("public-counter__metric")}>
            <AccessTimeRoundedIcon />
            <div>
              <strong><DigitalNumber value={`${settings.intervalSeconds || 30}s`} size="small" /></strong>
              <span>Auto Update</span>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default PublicUserCounter;
