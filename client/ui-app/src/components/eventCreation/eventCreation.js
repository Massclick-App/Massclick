import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAllEventCategory,
  getAllEventLocation,
  getAllEventCreation,
  createEventCreation,
  updateEventCreation,
  deleteEventCreation,
} from "../../redux/actions/eventAction";

import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import CustomizedTable from "../../components/Table/CustomizedTable";

import "./eventCreation.css";

const initialFormData = {
  eventName: "",
  eventCategory: "",
  eventLocation: "",
  description: "",
  eventImage: "",
  bannerImage: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  eventType: "physical",
  organizer: "",
  organizerEmail: "",
  organizerPhone: "",
  capacity: 0,
  registeredParticipants: 0,
  ticketPrice: 0,
  registrationUrl: "",
  keywords: "",
  slug: "",
  seoTitle: "",
  seoDescription: "",
  status: "upcoming",
  isActive: true,
  isPublished: false,
};

const parseKeywords = (keywords) =>
  keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

const toKeywordText = (keywords) => {
  if (Array.isArray(keywords)) return keywords.join(", ");
  return keywords || "";
};

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getRefId = (value) => {
  if (!value) return "";
  return typeof value === "object" ? value._id || value.id || "" : value;
};

const getCategoryLabel = (value) => {
  if (!value) return "-";
  if (typeof value === "object") return value.categoryName || value.slug || "-";
  return value;
};

const getLocationLabel = (value) => {
  if (!value) return "-";
  if (typeof value === "object") return value.locationName || value.city || "-";
  return value;
};

export default function EventCreation() {
  const dispatch = useDispatch();

  const {
    data = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.event.eventCreation);

  const { data: categories = [] } = useSelector(
    (state) => state.event.eventCategory
  );

  const { data: locations = [] } = useSelector(
    (state) => state.event.eventLocation
  );

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    dispatch(getAllEventCreation());
    dispatch(getAllEventCategory({ pageSize: 100, options: { status: "active" } }));
    dispatch(getAllEventLocation({ pageSize: 100, options: { status: "active" } }));
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const capacity = Number(formData.capacity);
    const registeredParticipants = Number(formData.registeredParticipants);
    const ticketPrice = Number(formData.ticketPrice);

    if (!formData.eventName.trim()) {
      newErrors.eventName = "Event name is required";
    }

    if (!formData.eventCategory) {
      newErrors.eventCategory = "Event category is required";
    }

    if (!formData.eventLocation) {
      newErrors.eventLocation = "Event location is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate < startDate
    ) {
      newErrors.endDate = "End date cannot be before start date";
    }

    if (Number.isNaN(capacity) || capacity < 0) {
      newErrors.capacity = "Capacity must be zero or a positive number";
    }

    if (Number.isNaN(registeredParticipants) || registeredParticipants < 0) {
      newErrors.registeredParticipants =
        "Registered participants must be zero or a positive number";
    }

    if (Number.isNaN(ticketPrice) || ticketPrice < 0) {
      newErrors.ticketPrice = "Ticket price must be zero or a positive number";
    }

    if (
      formData.organizerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.organizerEmail.trim())
    ) {
      newErrors.organizerEmail = "Enter a valid organizer email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => ({
    eventName: formData.eventName.trim(),
    eventCategory: formData.eventCategory,
    eventLocation: formData.eventLocation,
    description: formData.description.trim(),
    eventImage: formData.eventImage.trim(),
    bannerImage: formData.bannerImage.trim(),
    startDate: formData.startDate,
    endDate: formData.endDate,
    startTime: formData.startTime.trim(),
    endTime: formData.endTime.trim(),
    eventType: formData.eventType,
    organizer: formData.organizer.trim(),
    organizerEmail: formData.organizerEmail.trim(),
    organizerPhone: formData.organizerPhone.trim(),
    capacity: Number(formData.capacity) || 0,
    registeredParticipants: Number(formData.registeredParticipants) || 0,
    ticketPrice: Number(formData.ticketPrice) || 0,
    registrationUrl: formData.registrationUrl.trim(),
    keywords: parseKeywords(formData.keywords),
    seoTitle: formData.seoTitle.trim(),
    seoDescription: formData.seoDescription.trim(),
    status: formData.status,
    isActive: formData.isActive,
    isPublished: formData.isPublished,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
    setIsEditMode(false);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const payload = buildPayload();
    const action = isEditMode
      ? updateEventCreation(editId, payload)
      : createEventCreation(payload);

    dispatch(action)
      .then(() => {
        setSuccessMessage(
          isEditMode
            ? "Event updated successfully"
            : "Event created successfully"
        );
        dispatch(getAllEventCreation());
        resetForm();
      })
      .catch(console.error);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleEdit = (row) => {
    setFormData({
      eventName: row.eventName || "",
      eventCategory: getRefId(row.rawEventCategory),
      eventLocation: getRefId(row.rawEventLocation),
      description: row.description || "",
      eventImage: row.eventImage || "",
      bannerImage: row.bannerImage || "",
      startDate: formatDateInput(row.startDate),
      endDate: formatDateInput(row.endDate),
      startTime: row.startTime || "",
      endTime: row.endTime || "",
      eventType: row.eventType || "physical",
      organizer: row.organizer || "",
      organizerEmail: row.organizerEmail || "",
      organizerPhone: row.organizerPhone || "",
      capacity: row.capacity ?? 0,
      registeredParticipants: row.registeredParticipants ?? 0,
      ticketPrice: row.ticketPrice ?? 0,
      registrationUrl: row.registrationUrl || "",
      keywords: toKeywordText(row.rawKeywords),
      slug: row.slug || "",
      seoTitle: row.seoTitle || "",
      seoDescription: row.seoDescription || "",
      status: row.status || "upcoming",
      isActive: row.isActive,
      isPublished: row.isPublished,
    });

    setEditId(row.id);
    setIsEditMode(true);
    setErrors({});
  };

  const handleDeleteClick = (row) => {
    setSelectedEvent(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedEvent?.id) return;

    dispatch(deleteEventCreation(selectedEvent.id))
      .then(() => {
        dispatch(getAllEventCreation());
        setDeleteDialogOpen(false);
        setSelectedEvent(null);
        setSuccessMessage("Event deleted successfully");
      })
      .catch(console.error);
  };

  const rows = data.map((item) => ({
    _id: item._id,
    id: item._id,
    eventName: item.eventName || "",
    rawEventCategory: item.eventCategory,
    rawEventLocation: item.eventLocation,
    eventCategory: getCategoryLabel(item.eventCategory),
    eventLocation: getLocationLabel(item.eventLocation),
    description: item.description || "",
    eventImage: item.eventImage || "",
    bannerImage: item.bannerImage || "",
    startDate: item.startDate || "",
    endDate: item.endDate || "",
    dateRange: `${formatDateInput(item.startDate) || "-"} to ${
      formatDateInput(item.endDate) || "-"
    }`,
    startTime: item.startTime || "",
    endTime: item.endTime || "",
    timeRange:
      item.startTime || item.endTime
        ? `${item.startTime || "-"} to ${item.endTime || "-"}`
        : "-",
    eventType: item.eventType || "physical",
    organizer: item.organizer || "-",
    organizerEmail: item.organizerEmail || "",
    organizerPhone: item.organizerPhone || "",
    capacity: item.capacity ?? 0,
    registeredParticipants: item.registeredParticipants ?? 0,
    ticketPrice: item.ticketPrice ?? 0,
    registrationUrl: item.registrationUrl || "",
    rawKeywords: Array.isArray(item.keywords) ? item.keywords : [],
    keywords:
      Array.isArray(item.keywords) && item.keywords.length
        ? item.keywords.join(", ")
        : "-",
    slug: item.slug || "",
    seoTitle: item.seoTitle || "",
    seoDescription: item.seoDescription || "",
    status: item.status || "upcoming",
    isActive: item.isActive !== false,
    isPublished: item.isPublished === true,
    views: item.views ?? 0,
  }));

  const columns = [
    {
      id: "eventImage",
      label: "Image",
      renderCell: (value, row) =>
        value ? (
          <img
            className="eventCreation-thumb"
            src={value}
            alt={row.eventName}
          />
        ) : (
          "-"
        ),
    },
    {
      id: "eventName",
      label: "Event Name",
    },
    {
      id: "eventCategory",
      label: "Category",
    },
    {
      id: "eventLocation",
      label: "Location",
    },
    {
      id: "dateRange",
      label: "Date",
    },
    {
      id: "eventType",
      label: "Type",
    },
    {
      id: "status",
      label: "Status",
      renderCell: (value) => (
        <span className={`eventCreation-status eventCreation-status--${value}`}>
          {value}
        </span>
      ),
    },
    {
      id: "isPublished",
      label: "Published",
      renderCell: (value) => (
        <span
          className={`eventCreation-status ${
            value
              ? "eventCreation-status--published"
              : "eventCreation-status--draft"
          }`}
        >
          {value ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div className="eventCreation-actions">
          <IconButton
            color="primary"
            onClick={() => handleEdit(row)}
            aria-label="Edit event"
          >
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
            aria-label="Delete event"
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="eventCreation-page">
      <div className="eventCreation-card">
        <h2>
          {isEditMode
            ? "Edit Event"
            : "Create Event"}
        </h2>

        {successMessage && (
          <Alert severity="success">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="eventCreation-grid">
            <div>
              <label>Event Name *</label>

              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
              />

              {errors.eventName && (
                <p className="eventCreation-error-text">
                  {errors.eventName}
                </p>
              )}
            </div>

            <div>
              <label>Slug</label>

              <input
                type="text"
                name="slug"
                value={formData.slug}
                readOnly
                placeholder="Auto generated from event name"
              />
            </div>

            <div>
              <label>Event Category *</label>

              <select
                name="eventCategory"
                value={formData.eventCategory}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option
                    key={category._id}
                    value={category._id}
                  >
                    {category.categoryName}
                  </option>
                ))}
              </select>

              {errors.eventCategory && (
                <p className="eventCreation-error-text">
                  {errors.eventCategory}
                </p>
              )}
            </div>

            <div>
              <label>Event Location *</label>

              <select
                name="eventLocation"
                value={formData.eventLocation}
                onChange={handleChange}
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option
                    key={location._id}
                    value={location._id}
                  >
                    {location.locationName}
                  </option>
                ))}
              </select>

              {errors.eventLocation && (
                <p className="eventCreation-error-text">
                  {errors.eventLocation}
                </p>
              )}
            </div>

            <div>
              <label>Start Date *</label>

              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />

              {errors.startDate && (
                <p className="eventCreation-error-text">
                  {errors.startDate}
                </p>
              )}
            </div>

            <div>
              <label>End Date *</label>

              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />

              {errors.endDate && (
                <p className="eventCreation-error-text">
                  {errors.endDate}
                </p>
              )}
            </div>

            <div>
              <label>Start Time</label>

              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>End Time</label>

              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Event Type</label>

              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
              >
                <option value="physical">Physical</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            <div>
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="eventCreation-field--full">
              <label>Description</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <div>
              <label>Event Image URL</label>

              <input
                type="text"
                name="eventImage"
                value={formData.eventImage}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Banner Image URL</label>

              <input
                type="text"
                name="bannerImage"
                value={formData.bannerImage}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Organizer</label>

              <input
                type="text"
                name="organizer"
                value={formData.organizer}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Organizer Email</label>

              <input
                type="email"
                name="organizerEmail"
                value={formData.organizerEmail}
                onChange={handleChange}
              />

              {errors.organizerEmail && (
                <p className="eventCreation-error-text">
                  {errors.organizerEmail}
                </p>
              )}
            </div>

            <div>
              <label>Organizer Phone</label>

              <input
                type="text"
                name="organizerPhone"
                value={formData.organizerPhone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Registration URL</label>

              <input
                type="text"
                name="registrationUrl"
                value={formData.registrationUrl}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Capacity</label>

              <input
                type="number"
                name="capacity"
                min="0"
                value={formData.capacity}
                onChange={handleChange}
              />

              {errors.capacity && (
                <p className="eventCreation-error-text">
                  {errors.capacity}
                </p>
              )}
            </div>

            <div>
              <label>Registered Participants</label>

              <input
                type="number"
                name="registeredParticipants"
                min="0"
                value={formData.registeredParticipants}
                onChange={handleChange}
              />

              {errors.registeredParticipants && (
                <p className="eventCreation-error-text">
                  {errors.registeredParticipants}
                </p>
              )}
            </div>

            <div>
              <label>Ticket Price</label>

              <input
                type="number"
                name="ticketPrice"
                min="0"
                step="0.01"
                value={formData.ticketPrice}
                onChange={handleChange}
              />

              {errors.ticketPrice && (
                <p className="eventCreation-error-text">
                  {errors.ticketPrice}
                </p>
              )}
            </div>

            <div className="eventCreation-field--full">
              <label>Keywords</label>

              <input
                type="text"
                name="keywords"
                value={formData.keywords}
                onChange={handleChange}
                placeholder="conference, workshop, music"
              />
            </div>

            <div>
              <label>SEO Title</label>

              <input
                type="text"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>SEO Description</label>

              <textarea
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="eventCreation-toggle">
              <label htmlFor="eventCreation-isActive">
                Active Event
              </label>

              <input
                id="eventCreation-isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
            </div>

            <div className="eventCreation-toggle">
              <label htmlFor="eventCreation-isPublished">
                Published
              </label>

              <input
                id="eventCreation-isPublished"
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleChange}
              />
            </div>
          </div>

          {(formData.eventImage || formData.bannerImage) && (
            <div className="eventCreation-preview-list">
              {formData.eventImage && (
                <div className="eventCreation-image-preview">
                  <span>Event Image</span>
                  <img
                    src={formData.eventImage}
                    alt="Event preview"
                  />
                </div>
              )}

              {formData.bannerImage && (
                <div className="eventCreation-image-preview eventCreation-image-preview--banner">
                  <span>Banner Image</span>
                  <img
                    src={formData.bannerImage}
                    alt="Event banner preview"
                  />
                </div>
              )}
            </div>
          )}

          <div className="eventCreation-button-group">
            <button
              type="submit"
              className="eventCreation-save-btn"
              disabled={loading}
            >
              {loading ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : isEditMode ? (
                "Update Event"
              ) : (
                "Create Event"
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                className="eventCreation-cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <Typography
        variant="h6"
        sx={{
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        Event Creation Table
      </Typography>

      <Box>
        <CustomizedTable
          title="Events"
          data={rows}
          columns={columns}
          total={total}
          enableStatusFilter={false}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(
              getAllEventCreation({
                pageNo,
                pageSize,
                options,
              })
            )
          }
        />
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>

        <DialogContent>
          Are you sure you want to delete this event?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
