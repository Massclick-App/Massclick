import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import { fetchPublicUserCounter } from "../../../redux/actions/publicUserCounterAction.js";
import {
  formatCounterCount,
  getVisibleCounterCount,
} from "../../../utils/publicUserCounterUtils.js";
import styles from "./CategoryPublicCounterBadge.module.css";

const cx = createScopedClassNames(styles);

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[-_\s]+/g, " ")
    .replace(/\brestaurants\b/g, "restaurant")
    .replace(/\bcontractors\b/g, "contractor")
    .replace(/\s+/g, " ");

const CategoryPublicCounterBadge = ({ category }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.publicUserCounter?.publicSettings);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!settings) {
      dispatch(fetchPublicUserCounter()).catch(() => {});
    }
  }, [dispatch, settings]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const matchedCategory = useMemo(() => {
    const target = normalize(category);
    if (!target) return null;
    return (settings?.categories || []).find((item) => {
      const name = normalize(item.name);
      const slug = normalize(item.slug);
      return name === target || slug === target || name === `${target}s` || `${name}s` === target;
    });
  }, [category, settings]);

  if (!settings?.enabled || !matchedCategory) return null;

  const count = getVisibleCounterCount({
    ...matchedCategory,
    resetDaily: settings.resetDaily,
    startedAt: matchedCategory.startedAt || settings.startedAt,
    dailyResetTimeZone: settings.dailyResetTimeZone,
  }, now);

  return (
    <div className={cx("category-counter-badge")} aria-label={`${matchedCategory.name} public users count`}>
      <span className={cx("category-counter-badge__icon")}>
        <GroupsRoundedIcon />
      </span>
      <span className={cx("category-counter-badge__content")}>
        <strong>{formatCounterCount(count)}+</strong>
        <span>{matchedCategory.name} public users</span>
      </span>
      <span className={cx("category-counter-badge__live")}>Live</span>
    </div>
  );
};

export default CategoryPublicCounterBadge;
