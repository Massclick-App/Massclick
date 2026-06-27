import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cropper from "react-easy-crop";

import {
  createEventAdvertisement,
  deleteEventAdvertisement,
  getAllEventAdvertisement,
  updateEventAdvertisement,
} from "../../redux/actions/eventAction";

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Typography,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import CustomizedTable from "../../components/Table/CustomizedTable";
import AdminViewTabs from "../../components/AdminViewTabs.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";

import styles from "./eventAdvertisement.module.css";

const cx = createScopedClassNames(styles);

const HOME_POPUP_POSITION = "HOME_POPUP";

const initialFormData = {
  title: "",
  description: "",
  bannerImage: "",
  mobileBannerImage: "",
  redirectUrl: "",
  startDate: "",
  endDate: "",
  displayDuration: 0,
  showConfetti: false,
  isActive: true,
};

const DESKTOP_POPUP_RULES = {
  title: "Desktop Popup Image",
  targetWidth: 800,
  targetHeight: 600,
  recommended: "800 x 600 px",
  label: "Choose an image and crop it into the required 800 x 600 px desktop popup frame.",
};

const MOBILE_POPUP_RULES = {
  title: "Mobile Popup Image",
  targetWidth: 480,
  targetHeight: 640,
  recommended: "480 x 640 px",
  label: "Optional mobile popup image. Crop to 480 x 640 px.",
};

const getPopupRules = (cropType) =>
  cropType === "mobile" ? MOBILE_POPUP_RULES : DESKTOP_POPUP_RULES;

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const getImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image dimensions"));
    };

    image.src = objectUrl;
  });

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const cropImageToPopup = (imageSource, croppedAreaPixels, cropType = "desktop") =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const rules = getPopupRules(cropType);
      const { x, y, width, height } = croppedAreaPixels;
      const canvas = document.createElement("canvas");
      canvas.width = rules.targetWidth;
      canvas.height = rules.targetHeight;

      const context = canvas.getContext("2d");
      context.drawImage(
        image,
        x,
        y,
        width,
        height,
        0,
        0,
        rules.targetWidth,
        rules.targetHeight
      );

      resolve({
        base64: canvas.toDataURL("image/webp", 0.92),
        originalWidth: image.naturalWidth,
        originalHeight: image.naturalHeight,
      });
    };

    image.onerror = () => reject(new Error("Unable to crop image preview"));
    image.src = imageSource;
  });

export default function EventAdvertisement() {
  const dispatch = useDispatch();
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const {
    data = [],
    loading,
    error,
  } = useSelector((state) => state.event.eventAdvertisement);

  const [isEditMode, setIsEditMode] = useState(false);
  const [activeView, setActiveView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPopup, setSelectedPopup] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState(null);
  const [mobilePreview, setMobilePreview] = useState(null);
  const [desktopImageMeta, setDesktopImageMeta] = useState(null);
  const [mobileImageMeta, setMobileImageMeta] = useState(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropData, setCropData] = useState({
    image: null,
    cropType: "desktop",
    dimensions: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
  });

  useEffect(() => {
    dispatch(getAllEventAdvertisement());
  }, [dispatch]);

  const validateForm = () => {
    const newErrors = {};
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (!formData.title.trim()) {
      newErrors.title = "Popup title is required";
    }

    if (!isEditMode && !formData.bannerImage) {
      newErrors.bannerImage = "Desktop popup image is required";
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildPayload = () => {
    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      redirectUrl: formData.redirectUrl.trim(),
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      displayPosition: HOME_POPUP_POSITION,
      displayDuration: Number(formData.displayDuration) || 0,
      showConfetti: !!formData.showConfetti,
      isActive: formData.isActive,
    };

    if (formData.bannerImage.trim()) {
      payload.bannerImage = formData.bannerImage.trim();
    }

    if (formData.mobileBannerImage.trim()) {
      payload.mobileBannerImage = formData.mobileBannerImage.trim();
    }

    return payload;
  };

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

  const handleImageUpload = async (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dimensions = await getImageDimensions(file);
      const image = await readFileAsDataUrl(file);
      const cropType = fieldName === "mobileBannerImage" ? "mobile" : "desktop";

      if (cropType === "mobile") {
        setMobileImageMeta(dimensions);
      } else {
        setDesktopImageMeta(dimensions);
      }

      setCropData({
        image,
        cropType,
        dimensions,
        crop: { x: 0, y: 0 },
        zoom: 1,
        croppedAreaPixels: null,
      });
      setCropperOpen(true);
    } catch (uploadError) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: uploadError.message,
      }));
    }

    e.target.value = "";
  };

  const handlePopupCropSave = async () => {
    const fieldName =
      cropData.cropType === "mobile" ? "mobileBannerImage" : "bannerImage";

    if (!cropData.image || !cropData.croppedAreaPixels) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: "Please adjust the popup crop before saving",
      }));
      return;
    }

    try {
      const cropped = await cropImageToPopup(
        cropData.image,
        cropData.croppedAreaPixels,
        cropData.cropType
      );

      if (cropData.cropType === "mobile") {
        setMobilePreview(cropped.base64);
        setMobileImageMeta({
          width: cropped.originalWidth,
          height: cropped.originalHeight,
        });
      } else {
        setDesktopPreview(cropped.base64);
        setDesktopImageMeta({
          width: cropped.originalWidth,
          height: cropped.originalHeight,
        });
      }

      setFormData((prev) => ({
        ...prev,
        [fieldName]: cropped.base64,
      }));

      setErrors((prev) => {
        const next = { ...prev };
        delete next.bannerImage;
        delete next.mobileBannerImage;
        return next;
      });
      setCropperOpen(false);
    } catch (cropError) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: cropError.message,
      }));
    }
  };

  const handlePopupCropCancel = () => {
    setCropperOpen(false);
    if (desktopInputRef.current) desktopInputRef.current.value = "";
    if (mobileInputRef.current) mobileInputRef.current.value = "";
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditId(null);
    setIsEditMode(false);
    setErrors({});
    setDesktopPreview(null);
    setMobilePreview(null);
    setDesktopImageMeta(null);
    setMobileImageMeta(null);
    setCropperOpen(false);
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
            ? "Home popup updated successfully"
            : "Home popup created successfully"
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
      bannerImage: "",
      mobileBannerImage: "",
      redirectUrl: row.redirectUrl || "",
      startDate: formatDateInput(row.startDate),
      endDate: formatDateInput(row.endDate),
      displayDuration: row.displayDuration ?? 0,
      showConfetti: row.showConfetti ?? false,
      isActive: row.isActive,
    });

    setDesktopPreview(row.bannerImage || null);
    setMobilePreview(row.mobileBannerImage || null);
    setDesktopImageMeta(null);
    setMobileImageMeta(null);
    setEditId(row.id);
    setIsEditMode(true);
    setActiveView("form");
    setErrors({});
  };

  const handleDeleteClick = (row) => {
    setSelectedPopup(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedPopup?.id) return;

    dispatch(deleteEventAdvertisement(selectedPopup.id))
      .then(() => {
        dispatch(getAllEventAdvertisement());
        setDeleteDialogOpen(false);
        setSelectedPopup(null);
        setSuccessMessage("Home popup deleted successfully");
      })
      .catch(console.error);
  };

  const rows = data
    .filter((item) => item.displayPosition === HOME_POPUP_POSITION)
    .map((item) => ({
      _id: item._id,
      id: item._id,
      title: item.title || "",
      description: item.description || "",
      bannerImage: item.bannerImage || "",
      mobileBannerImage: item.mobileBannerImage || "",
      redirectUrl: item.redirectUrl || "",
      startDate: item.startDate || "",
      endDate: item.endDate || "",
      dateRange:
        item.startDate || item.endDate
          ? `${formatDateInput(item.startDate) || "-"} to ${formatDateInput(item.endDate) || "-"}`
          : "-",
      displayDuration: item.displayDuration ?? 0,
      showConfetti: item.showConfetti ?? false,
      clicks: item.clicks ?? 0,
      impressions: item.impressions ?? 0,
      isActive: item.isActive !== false,
      status: item.isActive !== false ? "Active" : "Inactive",
    }));

  const columns = [
    {
      id: "bannerImage",
      label: "Desktop Image",
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
      label: "Popup Title",
    },
    {
      id: "dateRange",
      label: "Schedule",
    },
    {
      id: "displayDuration",
      label: "Auto-close",
      renderCell: (value) => (value ? `${value}s` : "Manual"),
    },
    {
      id: "showConfetti",
      label: "Confetti",
      renderCell: (value) => (value ? "Yes" : "No"),
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
            aria-label="Edit home popup"
          >
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
            aria-label="Delete home popup"
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className={cx("eventAdvertisement-page")}>
      <AdminViewTabs
        activeView={activeView}
        onChange={setActiveView}
        isEditing={isEditMode}
        createLabel="Home Popup"
        listLabel="Home Popups"
        listCount={rows.length}
      />

      {activeView === "form" && (
        <div className={cx("eventAdvertisement-card")}>
          <h2>{isEditMode ? "Edit Home Popup" : "Create Home Popup"}</h2>

          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div className={cx("eventAdvertisement-grid")}>
              <div>
                <label className="form-input-label">Popup Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`form-text-input ${errors.title ? "error" : ""}`}
                />
                {errors.title && (
                  <p className="form-error-text">
                    {errors.title}
                  </p>
                )}
              </div>

              <div>
                <label className="form-input-label">Redirect URL</label>
                <input
                  type="text"
                  name="redirectUrl"
                  value={formData.redirectUrl}
                  onChange={handleChange}
                  className="form-text-input"
                />
              </div>

              <div className={cx("eventAdvertisement-field--full")}>
                <label className="form-input-label">Popup Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="form-textarea"
                />
              </div>

              <div className={cx("eventAdvertisement-upload-field")}>
                <label className="form-input-label">Desktop Popup Image *</label>
                <p className={cx("eventAdvertisement-upload-guidance")}>
                  {DESKTOP_POPUP_RULES.label}
                </p>

                <div className={cx("eventAdvertisement-upload-content")}>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    component="label"
                    className={cx("eventAdvertisement-upload-button")}
                  >
                    Upload Desktop Image
                    <input
                      ref={desktopInputRef}
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

                {desktopPreview && (
                  <div className={cx("eventAdvertisement-banner-preview")}>
                    <span>Desktop Preview</span>
                    <img src={desktopPreview} alt="Desktop popup preview" />
                  </div>
                )}
                {desktopImageMeta && (
                  <span className={cx("eventAdvertisement-image-meta")}>
                    Selected image: {desktopImageMeta.width} x {desktopImageMeta.height} px - saved as {DESKTOP_POPUP_RULES.recommended}
                  </span>
                )}
                {errors.bannerImage && (
                  <p className="form-error-text">
                    {errors.bannerImage}
                  </p>
                )}
              </div>

              <div className={cx("eventAdvertisement-upload-field")}>
                <label className="form-input-label">Mobile Popup Image</label>
                <p className={cx("eventAdvertisement-upload-guidance")}>
                  {MOBILE_POPUP_RULES.label}
                </p>

                <div className={cx("eventAdvertisement-upload-content")}>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    component="label"
                    className={cx("eventAdvertisement-upload-button")}
                  >
                    Upload Mobile Image
                    <input
                      ref={mobileInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => handleImageUpload(e, "mobileBannerImage")}
                    />
                  </Button>

                  {formData.mobileBannerImage && (
                    <Avatar
                      src={formData.mobileBannerImage}
                      variant="rounded"
                      sx={{ width: 48, height: 64 }}
                      className={cx("eventAdvertisement-preview-avatar")}
                    />
                  )}
                </div>

                {mobilePreview && (
                  <div className={cx("eventAdvertisement-banner-preview", "eventAdvertisement-banner-preview--mobile")}>
                    <span>Mobile Preview</span>
                    <img src={mobilePreview} alt="Mobile popup preview" />
                  </div>
                )}
                {mobileImageMeta && (
                  <span className={cx("eventAdvertisement-image-meta")}>
                    Selected mobile image: {mobileImageMeta.width} x {mobileImageMeta.height} px - saved as {MOBILE_POPUP_RULES.recommended}
                  </span>
                )}
                {errors.mobileBannerImage && (
                  <p className="form-error-text">
                    {errors.mobileBannerImage}
                  </p>
                )}
              </div>

              <div>
                <label className="form-input-label">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="form-text-input"
                />
              </div>

              <div>
                <label className="form-input-label">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`form-text-input ${errors.endDate ? "error" : ""}`}
                />
                {errors.endDate && (
                  <p className="form-error-text">
                    {errors.endDate}
                  </p>
                )}
              </div>

              <div>
                <label className="form-input-label">Auto-close Duration</label>
                <input
                  type="number"
                  name="displayDuration"
                  min="0"
                  step="1"
                  value={formData.displayDuration}
                  onChange={handleChange}
                  className="form-text-input"
                />
                <span className={cx("eventAdvertisement-help-text")}>
                  0 keeps the popup open until manually closed.
                </span>
              </div>

              <div className={cx("eventAdvertisement-toggle")}>
                <label className="form-input-label" htmlFor="homePopup-showConfetti">Show Confetti</label>
                <input
                  id="homePopup-showConfetti"
                  type="checkbox"
                  name="showConfetti"
                  checked={!!formData.showConfetti}
                  onChange={handleChange}
                />
              </div>

              <div className={cx("eventAdvertisement-toggle")}>
                <label className="form-input-label" htmlFor="homePopup-isActive">Active Popup</label>
                <input
                  id="homePopup-isActive"
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
                  <CircularProgress size={20} color="inherit" />
                ) : isEditMode ? (
                  "Update Home Popup"
                ) : (
                  "Create Home Popup"
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
      )}

      {activeView === "list" && (
        <>
          <Typography
            variant="h6"
            sx={{
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            Home Popup Table
          </Typography>

          <Box>
            <CustomizedTable
              title="Home Popups"
              data={rows}
              columns={columns}
              total={rows.length}
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
        </>
      )}

      <Dialog
        open={cropperOpen}
        onClose={handlePopupCropCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Crop {getPopupRules(cropData.cropType).title}</DialogTitle>

        <DialogContent dividers>
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: "8px",
              bgcolor: "#f8fafc",
              border: "1px solid #e5e7eb",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "#172033" }}
            >
              Forced output: {getPopupRules(cropData.cropType).recommended}
            </Typography>
            {cropData.dimensions && (
              <Typography
                variant="caption"
                sx={{ display: "block", mt: 0.5, color: "#6b7280" }}
              >
                Source image: {cropData.dimensions.width} x {cropData.dimensions.height} px
              </Typography>
            )}
          </Box>

          {cropData.image && (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                height: { xs: 280, sm: 340, md: 420 },
                bgcolor: "#0f172a",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <Cropper
                image={cropData.image}
                crop={cropData.crop}
                zoom={cropData.zoom}
                aspect={
                  getPopupRules(cropData.cropType).targetWidth /
                  getPopupRules(cropData.cropType).targetHeight
                }
                onCropChange={(crop) =>
                  setCropData((prev) => ({ ...prev, crop }))
                }
                onCropComplete={(croppedArea, croppedAreaPixels) =>
                  setCropData((prev) => ({ ...prev, croppedAreaPixels }))
                }
                onZoomChange={(zoom) =>
                  setCropData((prev) => ({ ...prev, zoom }))
                }
              />
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              sx={{ display: "block", mb: 1, color: "#6b7280" }}
            >
              Zoom: {(cropData.zoom * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={cropData.zoom}
              onChange={(event, zoom) =>
                setCropData((prev) => ({ ...prev, zoom }))
              }
              min={1}
              max={5}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handlePopupCropCancel}>Cancel</Button>
          <Button variant="contained" onClick={handlePopupCropSave}>
            Save Crop
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>

        <DialogContent>
          Are you sure you want to delete this home popup?
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>

          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
