import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Chip } from "@mui/material";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import {
  deleteMassclickFeedPost,
  getMassclickFeedPosts,
  updateMassclickFeedPostStatus,
} from "../../redux/actions/massclickFeedAction.js";
import styles from "./massclickFeed.module.css";

const cx = createScopedClassNames(styles);

const toDateTimeText = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const statusColor = (status) => {
  if (status === "active") return "success";
  if (status === "hidden") return "warning";
  if (status === "rejected") return "error";
  return "default";
};

export default function MassclickFeedAdmin() {
  const dispatch = useDispatch();
  const { posts = [], total = 0, loading } = useSelector((state) => state.massclickFeed || {});
  const [status, setStatus] = useState("all");

  useEffect(() => {
    dispatch(getMassclickFeedPosts({ options: { includeInactive: true, status } }));
  }, [dispatch, status]);

  const rows = useMemo(
    () =>
      posts.map((post) => ({
        id: post._id,
        _id: post._id,
        businessName: post.businessName || "-",
        businessCategory: post.businessCategory || "-",
        businessLocation: post.businessLocation || "-",
        title: post.title || "-",
        preview: post.text || "-",
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        status: post.status,
        createdAt: toDateTimeText(post.createdAt),
      })),
    [posts]
  );

  const refresh = () =>
    dispatch(getMassclickFeedPosts({ options: { includeInactive: true, status } }));

  const handleStatusUpdate = (row, nextStatus) => {
    dispatch(updateMassclickFeedPostStatus(row.id, nextStatus)).then(refresh);
  };

  const handleDelete = (row) => {
    if (window.confirm(`Delete feed post from "${row.businessName}"?`)) {
      dispatch(deleteMassclickFeedPost(row.id)).then(refresh);
    }
  };

  const columns = [
    { id: "businessName", label: "Business" },
    { id: "businessCategory", label: "Category" },
    { id: "businessLocation", label: "Location" },
    { id: "title", label: "Title" },
    {
      id: "preview",
      label: "Post",
      renderCell: (value) => <span className={cx("post-preview")}>{value}</span>,
    },
    { id: "likesCount", label: "Likes" },
    { id: "commentsCount", label: "Comments" },
    { id: "sharesCount", label: "Shares" },
    {
      id: "status",
      label: "Status",
      renderCell: (value) => (
        <Chip label={value} color={statusColor(value)} size="small" variant="outlined" />
      ),
    },
    { id: "createdAt", label: "Created" },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <Box className={cx("table-actions")}>
          {row.status !== "active" && (
            <button className={cx("action-button")} type="button" onClick={() => handleStatusUpdate(row, "active")}>
              Approve
            </button>
          )}
          {row.status === "active" && (
            <button className={cx("action-button")} type="button" onClick={() => handleStatusUpdate(row, "hidden")}>
              Hide
            </button>
          )}
          <button className={cx("action-button danger-button")} type="button" onClick={() => handleDelete(row)}>
            Delete
          </button>
        </Box>
      ),
    },
  ];

  return (
    <div className={cx("feed-admin-page")}>
      <div className={cx("feed-admin-header")}>
        <h1 className={cx("feed-admin-title")}>MassClick Feed</h1>
        <p className={cx("feed-admin-copy")}>Review business posts, discounts, images, comments, likes, and shares.</p>
      </div>

      <div className={cx("feed-admin-card")}>
        <div className={cx("toolbar")}>
          <h2 className={cx("feed-admin-title")}>Feed Moderation</h2>
          <select className={cx("status-filter")} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <CustomizedTable
          title="Feed Posts"
          data={rows}
          columns={columns}
          total={total}
          loading={loading}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(
              getMassclickFeedPosts({
                pageNo,
                pageSize,
                options: {
                  ...options,
                  includeInactive: true,
                  status,
                },
              })
            )
          }
        />
      </div>
    </div>
  );
}
