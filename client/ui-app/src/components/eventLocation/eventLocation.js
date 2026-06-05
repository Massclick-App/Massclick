import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAllEventLocation,
  createEventLocation,
  updateEventLocation,
  deleteEventLocation,
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

import styles from "./eventLocation.module.css";

const cx = createScopedClassNames(styles);

const initialFormData = {
  locationName: "",
  address: "",
  city: "",
  state: "",
  country: "",
  zipCode: "",
  latitude: "",
  longitude: "",
  locationImage: "",
  description: "",
  slug: "",
  isActive: true,
  capacity: 0,
};

const toOptionalNumber = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

export default function EventLocation() {
  const dispatch = useDispatch();

  const {
    data = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.event.eventLocation);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    dispatch(getAllEventLocation());
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};
    const latitude = toOptionalNumber(formData.latitude);
    const longitude = toOptionalNumber(formData.longitude);
    const capacity = Number(formData.capacity);

    if (!formData.locationName.trim()) {
      newErrors.locationName = "Location name is required";
    }

    if (formData.latitude !== "" && latitude === null) {
      newErrors.latitude = "Latitude must be a valid number";
    }

    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      newErrors.latitude = "Latitude must be between -90 and 90";
    }

    if (formData.longitude !== "" && longitude === null) {
      newErrors.longitude = "Longitude must be a valid number";
    }

    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      newErrors.longitude = "Longitude must be between -180 and 180";
    }

    if (Number.isNaN(capacity) || capacity < 0) {
      newErrors.capacity = "Capacity must be zero or a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => ({
    locationName: formData.locationName.trim(),
    address: formData.address.trim(),
    city: formData.city.trim(),
    state: formData.state.trim(),
    country: formData.country.trim(),
    zipCode: formData.zipCode.trim(),
    latitude: toOptionalNumber(formData.latitude),
    longitude: toOptionalNumber(formData.longitude),
    locationImage: formData.locationImage.trim(),
    description: formData.description.trim(),
    isActive: formData.isActive,
    capacity: Number(formData.capacity) || 0,
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
      ? updateEventLocation(editId, payload)
      : createEventLocation(payload);

    dispatch(action)
      .then(() => {
        setSuccessMessage(
          isEditMode
            ? "Event location updated successfully"
            : "Event location created successfully"
        );
        dispatch(getAllEventLocation());
        resetForm();
      })
      .catch(console.error);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleEdit = (row) => {
    setFormData({
      locationName: row.locationName || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      country: row.country || "",
      zipCode: row.zipCode || "",
      latitude: row.latitude ?? "",
      longitude: row.longitude ?? "",
      locationImage: row.locationImage || "",
      description: row.description || "",
      slug: row.slug || "",
      isActive: row.isActive,
      capacity: row.capacity ?? 0,
    });

    setEditId(row.id);
    setIsEditMode(true);
    setErrors({});
  };

  const handleDeleteClick = (row) => {
    setSelectedLocation(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedLocation?.id) return;

    dispatch(deleteEventLocation(selectedLocation.id))
      .then(() => {
        dispatch(getAllEventLocation());
        setDeleteDialogOpen(false);
        setSelectedLocation(null);
        setSuccessMessage("Event location deleted successfully");
      })
      .catch(console.error);
  };

  const rows = data.map((item) => ({
    _id: item._id,
    id: item._id,
    locationName: item.locationName || "",
    address: item.address || "",
    city: item.city || "",
    state: item.state || "",
    country: item.country || "",
    zipCode: item.zipCode || "",
    latitude: item.latitude,
    longitude: item.longitude,
    coordinates:
      item.latitude !== null &&
      item.latitude !== undefined &&
      item.longitude !== null &&
      item.longitude !== undefined
        ? `${item.latitude}, ${item.longitude}`
        : "-",
    locationImage: item.locationImage || "",
    description: item.description || "",
    slug: item.slug || "",
    isActive: item.isActive !== false,
    status: item.isActive !== false ? "Active" : "Inactive",
    capacity: item.capacity ?? 0,
  }));

  const columns = [
    {
      id: "locationImage",
      label: "Image",
      renderCell: (value, row) =>
        value ? (
          <img
            className={cx("eventLocation-thumb")}
            src={value}
            alt={row.locationName}
          />
        ) : (
          "-"
        ),
    },
    {
      id: "locationName",
      label: "Location Name",
    },
    {
      id: "city",
      label: "City",
    },
    {
      id: "state",
      label: "State",
    },
    {
      id: "country",
      label: "Country",
    },
    {
      id: "capacity",
      label: "Capacity",
    },
    {
      id: "coordinates",
      label: "Coordinates",
    },
    {
      id: "status",
      label: "Status",
      renderCell: (value, row) => (
        <span
          className={cx(`eventLocation-status ${
            row.isActive
              ? "eventLocation-status--active"
              : "eventLocation-status--inactive"
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
        <div className={cx("eventLocation-actions")}>
          <IconButton
            color="primary"
            onClick={() => handleEdit(row)}
            aria-label="Edit event location"
          >
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
            aria-label="Delete event location"
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={cx("eventLocation-page")}>
      <div className={cx("eventLocation-card")}>
        <h2>
          {isEditMode
            ? "Edit Event Location"
            : "Create Event Location"}
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
          <div className={cx("eventLocation-grid")}>
            <div>
              <label>Location Name *</label>

              <input
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
              />

              {errors.locationName && (
                <p className={cx("eventLocation-error-text")}>
                  {errors.locationName}
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
                placeholder="Auto generated from location name"
              />
            </div>

            <div className={cx("eventLocation-field--full")}>
              <label>Address</label>

              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div>
              <label>City</label>

              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>State</label>

              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Country</label>

              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Zip Code</label>

              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Latitude</label>

              <input
                type="number"
                name="latitude"
                step="any"
                value={formData.latitude}
                onChange={handleChange}
              />

              {errors.latitude && (
                <p className={cx("eventLocation-error-text")}>
                  {errors.latitude}
                </p>
              )}
            </div>

            <div>
              <label>Longitude</label>

              <input
                type="number"
                name="longitude"
                step="any"
                value={formData.longitude}
                onChange={handleChange}
              />

              {errors.longitude && (
                <p className={cx("eventLocation-error-text")}>
                  {errors.longitude}
                </p>
              )}
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
                <p className={cx("eventLocation-error-text")}>
                  {errors.capacity}
                </p>
              )}
            </div>

            <div className={cx("eventLocation-upload-field")}>
              <label>Location Image</label>

              <div className={cx("eventLocation-upload-content")}>
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  className={cx("eventLocation-upload-button")}
                >
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => handleImageUpload(e, "locationImage")}
                  />
                </Button>

                {formData.locationImage && (
                  <Avatar
                    src={formData.locationImage}
                    variant="rounded"
                    sx={{ width: 56, height: 56 }}
                    className={cx("eventLocation-preview-avatar")}
                  />
                )}
              </div>
            </div>

            <div className={cx("eventLocation-field--full")}>
              <label>Description</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <div className={cx("eventLocation-toggle")}>
              <label htmlFor="eventLocation-isActive">
                Active Location
              </label>

              <input
                id="eventLocation-isActive"
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={cx("eventLocation-button-group")}>
            <button
              type="submit"
              className={cx("eventLocation-save-btn")}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : isEditMode ? (
                "Update Location"
              ) : (
                "Create Location"
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                className={cx("eventLocation-cancel-btn")}
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
        Event Location Table
      </Typography>

      <Box>
        <CustomizedTable
          title="Event Locations"
          data={rows}
          columns={columns}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(
              getAllEventLocation({
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
          Are you sure you want to delete this event location?
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
