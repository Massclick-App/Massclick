import React, { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchFCMUsers,
  sendFCMMarketing,
  fetchFCMCampaigns,
  uploadFCMImage,
} from "../../redux/actions/fcmMarketingAction.js";
import {
  Box,
  CircularProgress,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CloseIcon from "@mui/icons-material/Close";
import UploadIcon from "@mui/icons-material/Upload";
import "./FCMMarketing.css";

const PLATFORM_OPTIONS = [
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "web", label: "Web" },
];

const TARGET_TYPES = [
  { value: "all", label: "All Users", desc: "Send to every user with an active token" },
  { value: "platform", label: "By Platform", desc: "Target a specific device platform" },
  { value: "specific_user", label: "Specific User", desc: "Send to one selected user" },
];

const EMPTY_FORM = {
  title: "",
  body: "",
  imageUrl: "",
  clickAction: "",
  targetType: "all",
  targetPlatform: "android",
  targetUserId: "",
  targetUserName: "",
  customData: [],
};

function NotificationPreview({ title, body, imageUrl, clickAction }) {
  return (
    <div className="fcm-preview-card">
      <div className="fcm-preview-header">
        <NotificationsActiveIcon sx={{ fontSize: 14, color: "#ff8c00" }} />
        <span className="fcm-preview-app">MassClick</span>
        <span className="fcm-preview-time">now</span>
      </div>
      <div className="fcm-preview-body">
        <p className="fcm-preview-title">{title || "Your notification title"}</p>
        <p className="fcm-preview-text">{body || "Your notification body text will appear here."}</p>
        {clickAction && (
          <p className="fcm-preview-action">
            🔗 <span>{clickAction}</span>
          </p>
        )}
      </div>
      {imageUrl && (
        <div className="fcm-preview-image-wrap fcm-preview-image-wrap--bottom">
          <img src={imageUrl} alt="notification" className="fcm-preview-image" onError={(e) => { e.target.style.display = "none"; }} />
        </div>
      )}
    </div>
  );
}

export default function FCMMarketing() {
  const dispatch = useDispatch();

  const {
    users = [],
    usersLoading = false,
    sending = false,
    lastSendResult = null,
    sendError = null,
    campaigns = [],
    campaignsTotal = 0,
    campaignsLoading = false,
  } = useSelector((state) => state.fcmMarketing || {});

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [userSearch, setUserSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [successBanner, setSuccessBanner] = useState(null);
  const [page, setPage] = useState(1);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageMode, setImageMode] = useState("upload"); // "upload" | "url"
  const fileInputRef = useRef(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    dispatch(fetchFCMUsers());
    dispatch(fetchFCMCampaigns(1, PAGE_SIZE));
  }, [dispatch]);

  const filteredUsers = userSearch.trim()
    ? users.filter(
        (u) =>
          u.userName?.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.mobileNumber1?.includes(userSearch)
      )
    : users;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const addCustomDataRow = () => {
    if (form.customData.length >= 10) return;
    setForm((prev) => ({ ...prev, customData: [...prev.customData, { key: "", value: "" }] }));
  };

  const updateCustomDataRow = (idx, field, val) => {
    const updated = form.customData.map((row, i) => (i === idx ? { ...row, [field]: val } : row));
    setForm((prev) => ({ ...prev, customData: updated }));
    if (errors[`customData_${idx}`]) {
      setErrors((prev) => ({ ...prev, [`customData_${idx}`]: "" }));
    }
  };

  const removeCustomDataRow = (idx) => {
    setForm((prev) => ({
      ...prev,
      customData: prev.customData.filter((_, i) => i !== idx),
    }));
  };

  const handleImageFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, imageUrl: "Please select an image file" }));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, imageUrl: "Image must be under 3 MB" }));
      return;
    }

    setImageUploading(true);
    setErrors((prev) => ({ ...prev, imageUrl: "" }));

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const url = await dispatch(uploadFCMImage(ev.target.result));
        handleChange("imageUrl", url);
      } catch {
        setErrors((prev) => ({ ...prev, imageUrl: "Upload failed. Try pasting a URL instead." }));
      } finally {
        setImageUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};

    if (!form.title.trim()) errs.title = "Title is required";
    else if (form.title.trim().length > 65) errs.title = "Title must be 65 characters or less";

    if (!form.body.trim()) errs.body = "Body is required";
    else if (form.body.trim().length > 200) errs.body = "Body must be 200 characters or less";

    if (form.imageUrl.trim() && !isValidUrl(form.imageUrl.trim()))
      errs.imageUrl = "Must be a valid URL (https://...)";

    if (form.clickAction.trim() && !isValidUrl(form.clickAction.trim()))
      errs.clickAction = "Must be a valid URL (https://...)";

    if (form.targetType === "platform" && !form.targetPlatform)
      errs.targetPlatform = "Select a platform";

    if (form.targetType === "specific_user" && !form.targetUserId)
      errs.targetUserId = "Select a user";

    form.customData.forEach((row, idx) => {
      if (row.key || row.value) {
        if (!row.key.trim()) errs[`customData_${idx}`] = "Key is required";
        else if (!/^[a-zA-Z0-9_]+$/.test(row.key.trim()))
          errs[`customData_${idx}`] = "Key must be alphanumeric (letters, numbers, underscores)";
        if (!row.value.trim()) errs[`customData_${idx}`] = errs[`customData_${idx}`] || "Value is required";
      }
    });

    return errs;
  };

  const isValidUrl = (str) => {
    try {
      const url = new URL(str);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const customDataObj = {};
    form.customData.forEach((row) => {
      if (row.key.trim() && row.value.trim()) {
        customDataObj[row.key.trim()] = row.value.trim();
      }
    });

    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      imageUrl: form.imageUrl.trim(),
      clickAction: form.clickAction.trim(),
      customData: customDataObj,
      targetType: form.targetType,
      targetPlatform: form.targetType === "platform" ? form.targetPlatform : "",
      targetUserId: form.targetType === "specific_user" ? form.targetUserId : null,
      targetUserName: form.targetType === "specific_user" ? form.targetUserName : "",
    };

    try {
      const result = await dispatch(sendFCMMarketing(payload));
      setSuccessBanner(result);
      setForm(EMPTY_FORM);
      setUserSearch("");
      setErrors({});
      dispatch(fetchFCMCampaigns(1, PAGE_SIZE));
      setPage(1);
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch {
      // error is in Redux state via sendError
    }
  };

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
      dispatch(fetchFCMCampaigns(newPage, PAGE_SIZE));
    },
    [dispatch]
  );

  const campaignColumns = [
    { id: "title", label: "Title", minWidth: 140 },
    { id: "body", label: "Body", minWidth: 180 },
    {
      id: "targetType",
      label: "Target",
      minWidth: 120,
      renderCell: (row) => {
        const map = { all: "All Users", platform: `Platform: ${row.targetPlatform}`, specific_user: row.targetUserName || "Specific User" };
        return <span className="fcm-table-target">{map[row.targetType] || row.targetType}</span>;
      },
    },
    {
      id: "totalTargeted",
      label: "Targeted",
      minWidth: 80,
      renderCell: (row) => <span className="fcm-table-num">{row.totalTargeted}</span>,
    },
    {
      id: "successCount",
      label: "Sent",
      minWidth: 70,
      renderCell: (row) => (
        <span className="fcm-table-success">{row.successCount}</span>
      ),
    },
    {
      id: "failureCount",
      label: "Failed",
      minWidth: 70,
      renderCell: (row) => (
        <span className={row.failureCount > 0 ? "fcm-table-fail" : "fcm-table-num"}>
          {row.failureCount}
        </span>
      ),
    },
    {
      id: "sentAt",
      label: "Sent At",
      minWidth: 150,
      renderCell: (row) =>
        row.sentAt ? new Date(row.sentAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "-",
    },
  ];

  const selectedUser = users.find((u) => u._id === form.targetUserId);

  return (
    <div className="fcm-page">
      {/* Header */}
      <div className="fcm-page-header">
        <div className="fcm-page-header-left">
          <NotificationsActiveIcon sx={{ fontSize: 28, color: "#ff8c00", mr: 1 }} />
          <div>
            <h1 className="fcm-page-title">Push Notifications</h1>
            <p className="fcm-page-subtitle">Send marketing push notifications to your app users</p>
          </div>
        </div>
        <div className="fcm-header-stats">
          {usersLoading ? (
            <CircularProgress size={18} sx={{ color: "#ff8c00" }} />
          ) : (
            <>
              <div className="fcm-stat-pill">
                <span className="fcm-stat-number">{users.length}</span>
                <span className="fcm-stat-label">Reachable Users</span>
              </div>
              <Tooltip title="Refresh user list">
                <IconButton size="small" onClick={() => dispatch(fetchFCMUsers())}>
                  <RefreshIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="fcm-banner fcm-banner-success">
          <CheckCircleOutlineIcon sx={{ fontSize: 20, mr: 1 }} />
          <span>
            Notification sent! <strong>{successBanner.successCount}</strong> delivered,{" "}
            <strong>{successBanner.failureCount}</strong> failed out of{" "}
            <strong>{successBanner.totalTargeted}</strong> targeted.
          </span>
        </div>
      )}

      {/* Send Error Banner */}
      {sendError && (
        <div className="fcm-banner fcm-banner-error">
          <ErrorOutlineIcon sx={{ fontSize: 20, mr: 1 }} />
          <span>{sendError}</span>
        </div>
      )}

      <div className="fcm-layout">
        {/* LEFT: Compose Form */}
        <form className="fcm-card fcm-compose" onSubmit={handleSubmit} noValidate>
          <h2 className="fcm-card-title">Compose Notification</h2>

          {/* Title */}
          <div className="fcm-field">
            <label className="fcm-label">
              Title <span className="fcm-required">*</span>
              <span className="fcm-char-count">{form.title.length}/65</span>
            </label>
            <input
              className={`fcm-input ${errors.title ? "fcm-input-error" : ""}`}
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="e.g. Big Sale Today!"
              maxLength={65}
            />
            {errors.title && <p className="fcm-error-msg">{errors.title}</p>}
          </div>

          {/* Body */}
          <div className="fcm-field">
            <label className="fcm-label">
              Body <span className="fcm-required">*</span>
              <span className="fcm-char-count">{form.body.length}/200</span>
            </label>
            <textarea
              className={`fcm-textarea ${errors.body ? "fcm-input-error" : ""}`}
              value={form.body}
              onChange={(e) => handleChange("body", e.target.value)}
              placeholder="e.g. Get 50% off on all services. Limited time offer!"
              maxLength={200}
              rows={3}
            />
            {errors.body && <p className="fcm-error-msg">{errors.body}</p>}
          </div>

          {/* Image */}
          <div className="fcm-field">
            <div className="fcm-label-row">
              <label className="fcm-label">
                Image <span className="fcm-optional">(optional)</span>
              </label>
              <div className="fcm-image-mode-toggle">
                <button
                  type="button"
                  className={`fcm-mode-btn ${imageMode === "upload" ? "fcm-mode-btn-active" : ""}`}
                  onClick={() => setImageMode("upload")}
                >
                  <UploadIcon sx={{ fontSize: 13, mr: 0.4 }} /> Upload
                </button>
                <button
                  type="button"
                  className={`fcm-mode-btn ${imageMode === "url" ? "fcm-mode-btn-active" : ""}`}
                  onClick={() => setImageMode("url")}
                >
                  URL
                </button>
              </div>
            </div>

            {form.imageUrl ? (
              <div className="fcm-image-preview-wrap">
                <img src={form.imageUrl} alt="notification" className="fcm-image-preview" />
                <button
                  type="button"
                  className="fcm-remove-image"
                  onClick={() => handleChange("imageUrl", "")}
                >
                  <CloseIcon sx={{ fontSize: 14 }} /> Remove
                </button>
              </div>
            ) : imageMode === "upload" ? (
              <div
                className={`fcm-upload-zone ${imageUploading ? "fcm-upload-zone-loading" : ""}`}
                onClick={() => !imageUploading && fileInputRef.current?.click()}
              >
                {imageUploading ? (
                  <>
                    <CircularProgress size={22} sx={{ color: "#ff8c00", mb: 1 }} />
                    <span className="fcm-upload-text">Uploading…</span>
                  </>
                ) : (
                  <>
                    <ImageOutlinedIcon sx={{ fontSize: 32, color: "#d1d5db", mb: 0.5 }} />
                    <span className="fcm-upload-text">Click to upload image</span>
                    <span className="fcm-upload-hint">PNG, JPG, WebP — max 3 MB</span>
                  </>
                )}
              </div>
            ) : (
              <input
                className={`fcm-input ${errors.imageUrl ? "fcm-input-error" : ""}`}
                type="url"
                value={form.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                placeholder="https://example.com/banner.png"
                autoFocus
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageFileSelect}
            />
            {errors.imageUrl && <p className="fcm-error-msg">{errors.imageUrl}</p>}
          </div>

          {/* Click Action */}
          <div className="fcm-field">
            <label className="fcm-label">Click Action URL <span className="fcm-optional">(optional)</span></label>
            <input
              className={`fcm-input ${errors.clickAction ? "fcm-input-error" : ""}`}
              type="url"
              value={form.clickAction}
              onChange={(e) => handleChange("clickAction", e.target.value)}
              placeholder="https://massclick.in/offers"
            />
            {errors.clickAction && <p className="fcm-error-msg">{errors.clickAction}</p>}
          </div>

          {/* Custom Data */}
          <div className="fcm-field">
            <div className="fcm-label-row">
              <label className="fcm-label">Custom Data <span className="fcm-optional">(optional)</span></label>
              {form.customData.length < 10 && (
                <button type="button" className="fcm-add-btn" onClick={addCustomDataRow}>
                  <AddIcon sx={{ fontSize: 14 }} /> Add Pair
                </button>
              )}
            </div>
            {form.customData.map((row, idx) => (
              <div key={idx} className="fcm-custom-row">
                <input
                  className={`fcm-input fcm-custom-key ${errors[`customData_${idx}`] ? "fcm-input-error" : ""}`}
                  placeholder="key"
                  value={row.key}
                  onChange={(e) => updateCustomDataRow(idx, "key", e.target.value)}
                />
                <input
                  className={`fcm-input fcm-custom-val ${errors[`customData_${idx}`] ? "fcm-input-error" : ""}`}
                  placeholder="value"
                  value={row.value}
                  onChange={(e) => updateCustomDataRow(idx, "value", e.target.value)}
                />
                <IconButton size="small" onClick={() => removeCustomDataRow(idx)} sx={{ color: "#ef4444" }}>
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
                {errors[`customData_${idx}`] && (
                  <p className="fcm-error-msg fcm-custom-error">{errors[`customData_${idx}`]}</p>
                )}
              </div>
            ))}
          </div>

          <hr className="fcm-divider" />

          {/* Target Type */}
          <div className="fcm-field">
            <label className="fcm-label">Target Audience <span className="fcm-required">*</span></label>
            <div className="fcm-target-grid">
              {TARGET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`fcm-target-btn ${form.targetType === t.value ? "fcm-target-btn-active" : ""}`}
                  onClick={() => handleChange("targetType", t.value)}
                >
                  <span className="fcm-target-label">{t.label}</span>
                  <span className="fcm-target-desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platform Filter */}
          {form.targetType === "platform" && (
            <div className="fcm-field">
              <label className="fcm-label">Platform <span className="fcm-required">*</span></label>
              <div className="fcm-platform-row">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={`fcm-platform-btn ${form.targetPlatform === p.value ? "fcm-platform-btn-active" : ""}`}
                    onClick={() => handleChange("targetPlatform", p.value)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {errors.targetPlatform && <p className="fcm-error-msg">{errors.targetPlatform}</p>}
            </div>
          )}

          {/* Specific User Search */}
          {form.targetType === "specific_user" && (
            <div className="fcm-field">
              <label className="fcm-label">Select User <span className="fcm-required">*</span></label>
              {selectedUser ? (
                <div className="fcm-selected-user">
                  <div>
                    <p className="fcm-selected-name">{selectedUser.userName}</p>
                    <p className="fcm-selected-mobile">{selectedUser.mobileNumber1}</p>
                  </div>
                  <div className="fcm-selected-meta">
                    {selectedUser.platforms.map((pl) => (
                      <Chip key={pl} label={pl} size="small" sx={{ mr: 0.5, bgcolor: "#fff3e8", color: "#ff8c00" }} />
                    ))}
                    <span className="fcm-token-count">{selectedUser.activeTokenCount} token(s)</span>
                  </div>
                  <button
                    type="button"
                    className="fcm-clear-user"
                    onClick={() => { handleChange("targetUserId", ""); handleChange("targetUserName", ""); setUserSearch(""); }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="fcm-user-search-wrap" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowDropdown(false); }}>
                  <input
                    className={`fcm-input ${errors.targetUserId ? "fcm-input-error" : ""}`}
                    type="text"
                    placeholder="Search by name or mobile..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                  />
                  {showDropdown && (
                    <div className="fcm-user-dropdown">
                      {usersLoading && <div className="fcm-dropdown-loading"><CircularProgress size={14} /></div>}
                      {!usersLoading && filteredUsers.length === 0 && (
                        <div className="fcm-dropdown-empty">No users found</div>
                      )}
                      {filteredUsers.slice(0, 50).map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          className="fcm-dropdown-item"
                          onMouseDown={() => {
                            handleChange("targetUserId", u._id);
                            handleChange("targetUserName", u.userName || u.mobileNumber1);
                            setUserSearch("");
                            setShowDropdown(false);
                          }}
                        >
                          <span className="fcm-dropdown-name">{u.userName || "Unknown"}</span>
                          <span className="fcm-dropdown-mobile">{u.mobileNumber1}</span>
                          <div className="fcm-dropdown-chips">
                            {u.platforms.map((pl) => (
                              <Chip key={pl} label={pl} size="small" sx={{ mr: 0.3, height: 18, fontSize: "0.65rem", bgcolor: "#fff3e8", color: "#ff8c00" }} />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {errors.targetUserId && <p className="fcm-error-msg">{errors.targetUserId}</p>}
            </div>
          )}

          {/* Audience count hint */}
          {form.targetType === "all" && !usersLoading && (
            <p className="fcm-audience-hint">
              This will target <strong>{users.length}</strong> reachable users.
            </p>
          )}
          {form.targetType === "platform" && form.targetPlatform && !usersLoading && (
            <p className="fcm-audience-hint">
              Users with active{" "}
              <strong>{form.targetPlatform}</strong> tokens:{" "}
              <strong>
                {users.filter((u) => u.platforms.includes(form.targetPlatform)).length}
              </strong>
            </p>
          )}

          <button type="submit" className="fcm-send-btn" disabled={sending}>
            {sending ? (
              <>
                <CircularProgress size={16} sx={{ color: "#fff", mr: 1 }} />
                Sending...
              </>
            ) : (
              <>
                <SendIcon sx={{ fontSize: 18, mr: 0.8 }} />
                Send Notification
              </>
            )}
          </button>
        </form>

        {/* RIGHT: Preview */}
        <div className="fcm-sidebar">
          <div className="fcm-card fcm-preview-section">
            <h2 className="fcm-card-title">Preview</h2>
            <NotificationPreview
              title={form.title}
              body={form.body}
              imageUrl={form.imageUrl}
              clickAction={form.clickAction}
            />
            <div className="fcm-preview-meta">
              <p><span className="fcm-meta-label">Target:</span> {TARGET_TYPES.find((t) => t.value === form.targetType)?.label}</p>
              {form.targetType === "platform" && (
                <p><span className="fcm-meta-label">Platform:</span> {form.targetPlatform || "—"}</p>
              )}
              {form.targetType === "specific_user" && (
                <p><span className="fcm-meta-label">User:</span> {form.targetUserName || "—"}</p>
              )}
              {form.customData.filter((r) => r.key && r.value).length > 0 && (
                <p><span className="fcm-meta-label">Custom data keys:</span> {form.customData.filter((r) => r.key).map((r) => r.key).join(", ")}</p>
              )}
            </div>
          </div>

          {/* Platform breakdown */}
          {!usersLoading && users.length > 0 && (
            <div className="fcm-card fcm-breakdown">
              <h2 className="fcm-card-title">User Breakdown</h2>
              <div className="fcm-breakdown-grid">
                {PLATFORM_OPTIONS.map((p) => {
                  const count = users.filter((u) => u.platforms.includes(p.value)).length;
                  return (
                    <div key={p.value} className="fcm-breakdown-item">
                      <span className="fcm-breakdown-count">{count}</span>
                      <span className="fcm-breakdown-label">{p.label}</span>
                    </div>
                  );
                })}
                <div className="fcm-breakdown-item fcm-breakdown-total">
                  <span className="fcm-breakdown-count">{users.length}</span>
                  <span className="fcm-breakdown-label">Total</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Campaign History Table */}
      <div className="fcm-card fcm-history-section">
        <div className="fcm-history-header">
          <h2 className="fcm-card-title">Campaign History</h2>
          <button
            className="fcm-refresh-btn"
            onClick={() => { dispatch(fetchFCMCampaigns(1, PAGE_SIZE)); setPage(1); }}
          >
            <RefreshIcon sx={{ fontSize: 16, mr: 0.5 }} />
            Refresh
          </button>
        </div>

        {campaignsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress sx={{ color: "#ff8c00" }} />
          </Box>
        ) : campaigns.length === 0 ? (
          <div className="fcm-empty-history">
            <NotificationsActiveIcon sx={{ fontSize: 40, color: "#d1d5db", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No campaigns sent yet. Send your first notification above.
            </Typography>
          </div>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #e5e7eb", borderRadius: "10px" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#f8f9fb" }}>
                    {campaignColumns.map((col) => (
                      <TableCell key={col.id} sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#1f2937", minWidth: col.minWidth }}>
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {campaigns.map((row) => (
                    <TableRow key={row._id} hover>
                      {campaignColumns.map((col) => (
                        <TableCell key={col.id} sx={{ fontSize: "0.82rem", color: "#374151" }}>
                          {col.renderCell ? col.renderCell(row) : (row[col.id] ?? "-")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {campaignsTotal > PAGE_SIZE && (
              <div className="fcm-pagination">
                <button
                  className="fcm-page-btn"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  Previous
                </button>
                <span className="fcm-page-info">
                  Page {page} of {Math.ceil(campaignsTotal / PAGE_SIZE)}
                </span>
                <button
                  className="fcm-page-btn"
                  disabled={page >= Math.ceil(campaignsTotal / PAGE_SIZE)}
                  onClick={() => handlePageChange(page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
