import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Avatar, CircularProgress, IconButton } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import AdminViewTabs from "../../components/AdminViewTabs.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import {
  deleteMassclickEvent,
  getAllMassclickEvents,
  saveMassclickEvent,
  uploadMassclickEventMedia,
} from "../../redux/actions/massclickEventAction.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames.js";
import styles from "./massclickEvent.module.css";

const cx = createScopedClassNames(styles);
const emptyForm = {
  title: "",
  description: "",
  fullDescription: "",
  venue: "",
  eventDate: "",
  featured: false,
  isPublished: false,
  sortOrder: 0,
  media: null,
  mediaItems: [],
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

export default function MassclickEvent() {
  const dispatch = useDispatch();
  const { data = [], total = 0, loading, error } = useSelector(
    (state) => state.massclickEvents
  );
  const [activeView, setActiveView] = useState("list");
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");

  const resetForm = () => {
    setFormData(emptyForm);
    setEditId(null);
    setFormError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMediaUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setFormError("");
    try {
      const uploadedItems = [];
      for (const file of files) {
        const mediaType = file.type.startsWith("video/") ? "video" : "image";
        const maxSize = mediaType === "video" ? 40 : 10;
        if (file.size > maxSize * 1024 * 1024) throw new Error(`${file.name} exceeds the ${maxSize}MB limit`);
        const fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        uploadedItems.push(await dispatch(uploadMassclickEventMedia(fileData, mediaType)));
      }
      setFormData((current) => {
        const mediaItems = [...(current.mediaItems || []), ...uploadedItems];
        return { ...current, media: current.media || mediaItems[0], mediaItems };
      });
    } catch (uploadError) {
      setFormError(uploadError.response?.data?.message || uploadError.message);
    } finally {
      setUploading(false);
    }
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.mediaItems?.length && !formData.media?.mediaKey) {
      setFormError("Please upload an event image or video");
      return;
    }
    try {
      await dispatch(saveMassclickEvent(formData, editId));
      setSuccessMessage(editId ? "MassClick event updated successfully" : "MassClick event created successfully");
      resetForm();
      setActiveView("list");
      window.setTimeout(() => setSuccessMessage(""), 3000);
    } catch (saveError) {
      setFormError(saveError.response?.data?.message || saveError.message);
    }
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setFormData({
      title: row.title,
      description: row.description,
      fullDescription: row.fullDescription,
      venue: row.venue,
      eventDate: formatDateInput(row.eventDate),
      featured: row.featured,
      isPublished: row.isPublished,
      sortOrder: row.sortOrder,
      media: row.media,
      mediaItems: row.mediaItems || [row.media].filter(Boolean),
    });
    setActiveView("form");
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    await dispatch(deleteMassclickEvent(row.id));
  };

  const rows = data.map((item) => ({
    id: item._id,
    title: item.title || "-",
    description: item.description || "",
    fullDescription: item.fullDescription || "",
    venue: item.venue || "",
    eventDate: item.eventDate,
    date: item.eventDate
      ? new Date(item.eventDate).toLocaleDateString("en-IN")
      : "-",
    media: item.media,
    mediaItems: item.mediaItems || [],
    mediaUrl: item.media?.mediaUrl || "",
    mediaType: item.media?.mediaType || "image",
    featured: Boolean(item.featured),
    isPublished: Boolean(item.isPublished),
    sortOrder: item.sortOrder || 0,
    status: item.isPublished ? "Published" : "Draft",
  }));

  const columns = [
    {
      id: "mediaUrl",
      label: "Media",
      renderCell: (value, row) =>
        value ? (
          row.mediaType === "video" ? (
            <video className={cx("massclickEvent-thumb")} src={value} muted />
          ) : (
            <img className={cx("massclickEvent-thumb")} src={value} alt={row.title} />
          )
        ) : "-",
    },
    { id: "title", label: "Event Title" },
    { id: "date", label: "Event Date" },
    { id: "sortOrder", label: "Order" },
    {
      id: "featured",
      label: "Featured",
      renderCell: (value) => (value ? "Yes" : "No"),
    },
    {
      id: "status",
      label: "Status",
      renderCell: (value, row) => (
        <span className={cx(`massclickEvent-status ${row.isPublished ? "massclickEvent-status--published" : "massclickEvent-status--draft"}`)}>
          {value}
        </span>
      ),
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div className={cx("massclickEvent-actions")}>
          <IconButton color="primary" onClick={() => handleEdit(row)} aria-label="Edit MassClick event">
            <EditRoundedIcon />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(row)} aria-label="Delete MassClick event">
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={cx("massclickEvent-page")}>
      <AdminViewTabs
        activeView={activeView}
        onChange={setActiveView}
        isEditing={Boolean(editId)}
        createLabel="MassClick Event"
        listLabel="MassClick Events"
        listCount={rows.length}
      />

      {activeView === "form" && (
        <div className={cx("massclickEvent-card")}>
          <h2>{editId ? "Edit MassClick Event" : "Create MassClick Event"}</h2>
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {(formError || error) && <Alert severity="error">{formError || error?.message || error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div className={cx("massclickEvent-grid")}>
              <div>
                <label className="form-input-label">Event Title *</label>
                <input className="form-text-input" name="title" required maxLength="120" value={formData.title} onChange={handleChange} />
              </div>
              <div>
                <label className="form-input-label">Event Date *</label>
                <input className="form-text-input" name="eventDate" type="date" required value={formData.eventDate} onChange={handleChange} />
              </div>
              <div className={cx("massclickEvent-field--full")}>
                <label className="form-input-label">Description</label>
                <textarea className="form-textarea" name="description" rows="4" maxLength="500" value={formData.description} onChange={handleChange} />
              </div>
              <div className={cx("massclickEvent-field--full")}>
                <label className="form-input-label">Full Event Story / Documentation</label>
                <textarea className="form-textarea" name="fullDescription" rows="10" maxLength="10000" value={formData.fullDescription} onChange={handleChange} placeholder="Write the complete event story, activities, achievements and memorable moments..." />
              </div>
              <div>
                <label className="form-input-label">Venue</label>
                <input className="form-text-input" name="venue" maxLength="180" value={formData.venue} onChange={handleChange} />
              </div>
              <div>
                <label className="form-input-label">Display Order</label>
                <input className="form-text-input" name="sortOrder" type="number" min="0" value={formData.sortOrder} onChange={handleChange} />
              </div>
              <div className={cx("massclickEvent-upload")}>
                <label className="form-input-label">Image or Video *</label>
                <label className={cx("massclickEvent-uploadButton")}>
                  <CloudUploadIcon />
                  <span>{uploading ? "Uploading..." : "Choose Images / Videos"}</span>
                  <input type="file" hidden multiple disabled={uploading} accept="image/*,video/mp4,video/webm,video/quicktime" onChange={handleMediaUpload} />
                </label>
                <small>Images up to 10MB; videos up to 40MB</small>
              </div>
              {formData.mediaItems?.length > 0 && (
                <div className={cx("massclickEvent-previewGrid")}>
                  {formData.mediaItems.map((media, index) => (
                    <div className={cx("massclickEvent-preview")} key={`${media.mediaKey}-${index}`}>
                      {media.mediaType === "video" ? <video src={media.mediaUrl} controls /> : <Avatar className={cx("massclickEvent-previewImage")} src={media.mediaUrl} variant="rounded" />}
                      <button type="button" onClick={() => setFormData((current) => {
                        const mediaItems = current.mediaItems.filter((_, itemIndex) => itemIndex !== index);
                        return { ...current, mediaItems, media: mediaItems[0] || null };
                      })}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
              <label className={cx("massclickEvent-toggle")}>
                <input name="featured" type="checkbox" checked={formData.featured} onChange={handleChange} />
                Featured Event
              </label>
              <label className={cx("massclickEvent-toggle")}>
                <input name="isPublished" type="checkbox" checked={formData.isPublished} onChange={handleChange} />
                Published
              </label>
            </div>
            <div className={cx("massclickEvent-buttonGroup")}>
              <button className={cx("massclickEvent-saveButton")} type="submit" disabled={loading || uploading}>
                {loading ? <CircularProgress size={20} color="inherit" /> : editId ? "Update Event" : "Create Event"}
              </button>
              {editId && <button className={cx("massclickEvent-cancelButton")} type="button" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </div>
      )}

      {activeView === "list" && (
        <>
          <h2 className={cx("massclickEvent-tableTitle")}>MassClick Events Table</h2>
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          <CustomizedTable
            title="MassClick Events"
            data={rows}
            columns={columns}
            total={total}
            loading={loading}
            statusOptions={[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ]}
            fetchData={(pageNo, pageSize, options) =>
              dispatch(getAllMassclickEvents({ pageNo, pageSize, options: { ...options, includeUnpublished: true } }))
            }
          />
        </>
      )}
    </div>
  );
}
