import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAllEventCategory,
  getAllEventLocation,
  getAllEventAdvertisement,
  createEventAdvertisement,
  updateEventAdvertisement,
  deleteEventAdvertisement,
} from "../../redux/actions/eventAction";

import {
  Avatar,
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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import CustomizedTable from "../../components/Table/CustomizedTable";
import { createScopedClassNames } from "../../utils/createScopedClassNames";

import styles from "./eventAdvertisement.module.css";

const cx = createScopedClassNames(styles);

const initialFormData = {
  title: "",
  description: "",
  eventCategory: "",
  eventLocation: "",
  advertisementImage: "",
  bannerImage: "",
  advertiserName: "",
  advertiserContact: "",
  advertiserEmail: "",
  redirectUrl: "",
  startDate: "",
  endDate: "",
  displayPosition: "middle",
  slug: "",
  isActive: true,
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

export default function EventAdvertisement() {
  const dispatch = useDispatch();

  const {
    data = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.event.eventAdvertisement);

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
  const [selectedAdvertisement, setSelectedAdvertisement] = useState(null);

  useEffect(() => {
    dispatch(getAllEventAdvertisement());
    dispatch(getAllEventCategory({ pageSize: 100, options: { status: "active" } }));
    dispatch(getAllEventLocation({ pageSize: 100, options: { status: "active" } }));
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.eventCategory) {
      newErrors.eventCategory = "Event category is required";
    }

    if (!formData.eventLocation) {
      newErrors.eventLocation = "Event location is required";
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

    if (
      formData.advertiserEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.advertiserEmail.trim())
    ) {
      newErrors.advertiserEmail = "Enter a valid advertiser email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => ({
    title: formData.title.trim(),
    description: formData.description.trim(),
    eventCategory: formData.eventCategory,
    eventLocation: formData.eventLocation,
    advertisementImage: formData.advertisementImage.trim(),
    bannerImage: formData.bannerImage.trim(),
    advertiserName: formData.advertiserName.trim(),
    advertiserContact: formData.advertiserContact.trim(),
    advertiserEmail: formData.advertiserEmail.trim(),
    redirectUrl: formData.redirectUrl.trim(),
    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    displayPosition: formData.displayPosition,
    isActive: formData.isActive,
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

  const handleImageUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: reader.result || "",
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
      ? updateEventAdvertisement(editId, payload)
      : createEventAdvertisement(payload);

    dispatch(action)
      .then(() => {
        setSuccessMessage(
          isEditMode
            ? "Event advertisement updated successfully"
            : "Event advertisement created successfully"
        );
        dispatch(getAllEventAdvertisement());
        resetForm();
      })
      .catch(console.error);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleEdit = (row) => {
    setFormData({
      title: row.title || "",
      description: row.description || "",
      eventCategory: getRefId(row.rawEventCategory),
      eventLocation: getRefId(row.rawEventLocation),
      advertisementImage: row.advertisementImage || "",
      bannerImage: row.bannerImage || "",
      advertiserName: row.advertiserName || "",
      advertiserContact: row.advertiserContact || "",
      advertiserEmail: row.advertiserEmail || "",
      redirectUrl: row.redirectUrl || "",
      startDate: formatDateInput(row.startDate),
      endDate: formatDateInput(row.endDate),
      displayPosition: row.displayPosition || "middle",
      slug: row.slug || "",
      isActive: row.isActive,
    });

    setEditId(row.id);
    setIsEditMode(true);
    setErrors({});
  };

  const handleDeleteClick = (row) => {
    setSelectedAdvertisement(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedAdvertisement?.id) return;

    dispatch(deleteEventAdvertisement(selectedAdvertisement.id))
      .then(() => {
        dispatch(getAllEventAdvertisement());
        setDeleteDialogOpen(false);
        setSelectedAdvertisement(null);
        setSuccessMessage("Event advertisement deleted successfully");
      })
      .catch(console.error);
  };

  const rows = data.map((item) => ({
    _id: item._id,
    id: item._id,
    title: item.title || "",
    description: item.description || "",
    rawEventCategory: item.eventCategory,
    rawEventLocation: item.eventLocation,
    eventCategory: getCategoryLabel(item.eventCategory),
    eventLocation: getLocationLabel(item.eventLocation),
    advertisementImage: item.advertisementImage || "",
    bannerImage: item.bannerImage || "",
    advertiserName: item.advertiserName || "-",
    advertiserContact: item.advertiserContact || "",
    advertiserEmail: item.advertiserEmail || "",
    redirectUrl: item.redirectUrl || "",
    startDate: item.startDate || "",
    endDate: item.endDate || "",
    dateRange:
      item.startDate || item.endDate
        ? `${formatDateInput(item.startDate) || "-"} to ${formatDateInput(item.endDate) || "-"}`
        : "-",
    displayPosition: item.displayPosition || "middle",
    clicks: item.clicks ?? 0,
    impressions: item.impressions ?? 0,
    slug: item.slug || "",
    isActive: item.isActive !== false,
    status: item.isActive !== false ? "Active" : "Inactive",
  }));

  const columns = [
    {
      id: "advertisementImage",
      label: "Image",
      renderCell: (value, row) =>
        value ? (
          <img
            className={cx("eventAdvertisement-thumb")}
            src={value}
            alt={row.title}
          />
        ) : (
          "-"
        ),
    },
    {
      id: "title",
      label: "Title",
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
      id: "advertiserName",
      label: "Advertiser",
    },
    {
      id: "displayPosition",
      label: "Position",
    },
    {
      id: "dateRange",
      label: "Date",
    },
    {
      id: "clicks",
      label: "Clicks",
    },
    {
      id: "impressions",
      label: "Impressions",
    },
    {
      id: "status",
      label: "Status",
      renderCell: (value, row) => (
        <span
          className={cx(`eventAdvertisement-status ${
            row.isActive
              ? "eventAdvertisement-status--active"
              : "eventAdvertisement-status--inactive"
          }`)}
        >
          {value}
        </span>
      ),
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div className={cx("eventAdvertisement-actions")}>
          <IconButton
            color="primary"
            onClick={() => handleEdit(row)}
            aria-label="Edit event advertisement"
          >
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
            aria-label="Delete event advertisement"
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={cx("eventAdvertisement-page")}>
      <div className={cx("eventAdvertisement-card")}>
        <h2>
          {isEditMode
            ? "Edit Event Advertisement"
            : "Create Event Advertisement"}
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
          <div className={cx("eventAdvertisement-grid")}>
            <div>
              <label>Title *</label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
              />

              {errors.title && (
                <p className={cx("eventAdvertisement-error-text")}>
                  {errors.title}
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
                placeholder="Auto generated from title"
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
                <p className={cx("eventAdvertisement-error-text")}>
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
                <p className={cx("eventAdvertisement-error-text")}>
                  {errors.eventLocation}
                </p>
              )}
            </div>

            <div className={cx("eventAdvertisement-field--full")}>
              <label>Description</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <div className={cx("eventAdvertisement-upload-field")}>
              <label>Advertisement Image</label>

              <div className={cx("eventAdvertisement-upload-content")}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  className={cx("eventAdvertisement-upload-button")}
                >
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) =>
                      handleImageUpload(e, "advertisementImage")
                    }
                  />
                </Button>

                {formData.advertisementImage && (
                  <Avatar
                    src={formData.advertisementImage}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                    className={cx("eventAdvertisement-preview-avatar")}
                  />
                )}
              </div>
            </div>

            <div className={cx("eventAdvertisement-upload-field")}>
              <label>Banner Image</label>

              <div className={cx("eventAdvertisement-upload-content")}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  className={cx("eventAdvertisement-upload-button")}
                >
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImageUpload(e, "bannerImage")}
                  />
                </Button>

                {formData.bannerImage && (
                  <Avatar
                    src={formData.bannerImage}
                    variant="rounded"
                    sx={{ width: 96, height: 56 }}
                    className={cx("eventAdvertisement-preview-avatar")}
                  />
                )}
              </div>
            </div>

            <div>
              <label>Advertiser Name</label>

              <input
                type="text"
                name="advertiserName"
                value={formData.advertiserName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Advertiser Contact</label>

              <input
                type="text"
                name="advertiserContact"
                value={formData.advertiserContact}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Advertiser Email</label>

              <input
                type="email"
                name="advertiserEmail"
                value={formData.advertiserEmail}
                onChange={handleChange}
              />

              {errors.advertiserEmail && (
                <p className={cx("eventAdvertisement-error-text")}>
                  {errors.advertiserEmail}
                </p>
              )}
            </div>

            <div>
              <label>Redirect URL</label>

              <input
                type="text"
                name="redirectUrl"
                value={formData.redirectUrl}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Start Date</label>

              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>End Date</label>

              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
              />

              {errors.endDate && (
                <p className={cx("eventAdvertisement-error-text")}>
                  {errors.endDate}
                </p>
              )}
            </div>

            <div>
              <label>Display Position</label>

              <select
                name="displayPosition"
                value={formData.displayPosition}
                onChange={handleChange}
              >
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>

            <div className={cx("eventAdvertisement-toggle")}>
              <label htmlFor="eventAdvertisement-isActive">
                Active Advertisement
              </label>

              <input
                id="eventAdvertisement-isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={cx("eventAdvertisement-button-group")}>
            <button
              type="submit"
              className={cx("eventAdvertisement-save-btn")}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : isEditMode ? (
                "Update Advertisement"
              ) : (
                "Create Advertisement"
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                className={cx("eventAdvertisement-cancel-btn")}
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
        Event Advertisement Table
      </Typography>

      <Box>
        <CustomizedTable
          title="Event Advertisements"
          data={rows}
          columns={columns}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(
              getAllEventAdvertisement({
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
          Are you sure you want to delete this event advertisement?
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
