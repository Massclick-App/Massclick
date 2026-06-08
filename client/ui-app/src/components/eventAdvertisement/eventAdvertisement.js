import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Cropper from "react-easy-crop";

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
  Slider,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import CustomizedTable from "../../components/Table/CustomizedTable";
import AdminViewTabs from "../../components/AdminViewTabs.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";

import styles from "./eventAdvertisement.module.css";

const cx = createScopedClassNames(styles);

const HOME_POPUP_RULES = {
  key: "desktop",
  title: "Popup Desktop Image",
  targetWidth: 800,
  targetHeight: 600,
  recommended: "800 x 600 px",
  label: "Choose an image and crop it into the required 800 x 600 px popup frame."
};
const MOBILE_HOME_POPUP_RULES = {
  key: "mobile",
  title: "Popup Mobile Image",
  targetWidth: 480,
  targetHeight: 640,
  recommended: "480 x 640 px",
  label: "Optional mobile popup image. Crop to 480 x 640 px."
};

const getImageDimensions = file => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve({
      width: image.naturalWidth,
      height: image.naturalHeight
    });
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error("Unable to read image dimensions"));
  };
  image.src = objectUrl;
});

const cropImageToPopup = (imageSource, croppedAreaPixels, cropType = "desktop") => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    const rules = cropType === "mobile" ? MOBILE_HOME_POPUP_RULES : HOME_POPUP_RULES;
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const targetWidth = rules.targetWidth;
    const targetHeight = rules.targetHeight;
    const { x, y, width, height } = croppedAreaPixels;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, x, y, width, height, 0, 0, targetWidth, targetHeight);

    resolve({
      base64: canvas.toDataURL("image/webp", 0.92),
      originalWidth: sourceWidth,
      originalHeight: sourceHeight,
      width: targetWidth,
      height: targetHeight
    });
  };

  image.onerror = () => {
    reject(new Error("Unable to crop image preview"));
  };

  image.src = imageSource;
});

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
  popupImage: "",
  mobilePopupImage: "",
  popupAutoCloseDuration: 0,
  popupShowConfetti: false,
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
  const popupFileInputRef = useRef(null);
  const mobilePopupFileInputRef = useRef(null);

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
  const [activeView, setActiveView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAdvertisement, setSelectedAdvertisement] = useState(null);
  const [popupPreview, setPopupPreview] = useState(null);
  const [popupImageMeta, setPopupImageMeta] = useState(null);
  const [mobilePopupPreview, setMobilePopupPreview] = useState(null);
  const [mobilePopupImageMeta, setMobilePopupImageMeta] = useState(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropData, setCropData] = useState({
    image: null,
    cropType: "desktop",
    dimensions: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null
  });

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

  const convertToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

  const handlePopupImageChange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    let dimensions;
    try {
      dimensions = await getImageDimensions(file);
    } catch (error) {
      setErrors(prev => ({ ...prev, popupImage: error.message }));
      return;
    }

    const sourceImage = await convertToBase64(file);
    setPopupImageMeta(dimensions);
    setCropData({
      image: sourceImage,
      cropType: "desktop",
      dimensions,
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null
    });
    setCropperOpen(true);
  };

  const handleMobilePopupImageChange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    let dimensions;
    try {
      dimensions = await getImageDimensions(file);
    } catch (error) {
      setErrors(prev => ({ ...prev, mobilePopupImage: error.message }));
      return;
    }

    const sourceImage = await convertToBase64(file);
    setMobilePopupImageMeta(dimensions);
    setCropData({
      image: sourceImage,
      cropType: "mobile",
      dimensions,
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null
    });
    setCropperOpen(true);
  };

  const handlePopupCropSave = async () => {
    if (!cropData.image || !cropData.croppedAreaPixels) {
      setErrors(prev => ({
        ...prev,
        [cropData.cropType === "mobile" ? "mobilePopupImage" : "popupImage"]: "Please adjust the popup crop before saving"
      }));
      return;
    }

    try {
      const cropped = await cropImageToPopup(cropData.image, cropData.croppedAreaPixels, cropData.cropType);
      if (cropData.cropType === "mobile") {
        setMobilePopupPreview(cropped.base64);
        setMobilePopupImageMeta({
          width: cropped.originalWidth,
          height: cropped.originalHeight
        });
        setFormData(p => ({
          ...p,
          mobilePopupImage: cropped.base64
        }));
      } else {
        setPopupPreview(cropped.base64);
        setPopupImageMeta({
          width: cropped.originalWidth,
          height: cropped.originalHeight
        });
        setFormData(p => ({
          ...p,
          popupImage: cropped.base64
        }));
      }
      setErrors(prev => {
        const next = { ...prev };
        delete next.popupImage;
        delete next.mobilePopupImage;
        return next;
      });
      setCropperOpen(false);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [cropData.cropType === "mobile" ? "mobilePopupImage" : "popupImage"]: error.message
      }));
    }
  };

  const handlePopupCropCancel = () => {
    setCropperOpen(false);
    if (popupFileInputRef.current) popupFileInputRef.current.value = "";
    if (mobilePopupFileInputRef.current) mobilePopupFileInputRef.current.value = "";
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
    popupImage: formData.popupImage.trim(),
    mobilePopupImage: formData.mobilePopupImage.trim(),
    popupAutoCloseDuration: formData.popupAutoCloseDuration,
    popupShowConfetti: formData.popupShowConfetti,
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
    setPopupPreview(null);
    setPopupImageMeta(null);
    setMobilePopupPreview(null);
    setMobilePopupImageMeta(null);
    setCropperOpen(false);
    setCropData({
      image: null,
      cropType: "desktop",
      dimensions: null,
      crop: { x: 0, y: 0 },
      zoom: 1,
      croppedAreaPixels: null
    });
    if (popupFileInputRef.current) popupFileInputRef.current.value = "";
    if (mobilePopupFileInputRef.current) mobilePopupFileInputRef.current.value = "";
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
      popupImage: "",
      mobilePopupImage: "",
      popupAutoCloseDuration: row.popupAutoCloseDuration || 0,
      popupShowConfetti: row.popupShowConfetti || false,
    });

    setPopupPreview(row.popupImage || null);
    setMobilePopupPreview(row.mobilePopupImage || null);
    setPopupImageMeta(null);
    setMobilePopupImageMeta(null);

    setEditId(row.id);
    setIsEditMode(true);
    setActiveView("form");
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
    popupImage: item.popupImage || "",
    mobilePopupImage: item.mobilePopupImage || "",
    popupAutoCloseDuration: item.popupAutoCloseDuration ?? 0,
    popupShowConfetti: item.popupShowConfetti ?? false,
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
      <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={isEditMode} createLabel="Event Advertisement" listLabel="Event Advertisements" listCount={rows.length} />

      {activeView === "form" && <div className={cx("eventAdvertisement-card")}>
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
                <option value="popup">Popup</option>
              </select>
            </div>

            {formData.displayPosition === "popup" && (
              <>
                <div className={cx("eventAdvertisement-upload-field")}>
                  <label>Popup Image</label>

                  <div className={cx("eventAdvertisement-upload-content")}>
                    <Button
                      variant="contained"
                      startIcon={<CloudUploadIcon />}
                      component="label"
                      className={cx("eventAdvertisement-upload-button")}
                    >
                      Upload Popup Image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        ref={popupFileInputRef}
                        onChange={handlePopupImageChange}
                      />
                    </Button>

                    {popupPreview && (
                      <Avatar
                        src={popupPreview}
                        variant="rounded"
                        sx={{ width: 56, height: 56 }}
                        className={cx("eventAdvertisement-preview-avatar")}
                      />
                    )}
                  </div>
                  {popupImageMeta && <span className={cx("eventAdvertisement-error-text")} style={{ color: "#6b7280", fontWeight: 400 }}>
                    Selected image: {popupImageMeta.width} x {popupImageMeta.height} px -> saved as {HOME_POPUP_RULES.recommended}
                  </span>}
                  {errors.popupImage && (
                    <p className={cx("eventAdvertisement-error-text")}>
                      {errors.popupImage}
                    </p>
                  )}
                </div>

                <div className={cx("eventAdvertisement-upload-field")}>
                  <label>Mobile Popup Image</label>

                  <div className={cx("eventAdvertisement-upload-content")}>
                    <Button
                      variant="contained"
                      startIcon={<CloudUploadIcon />}
                      component="label"
                      className={cx("eventAdvertisement-upload-button")}
                    >
                      Upload Mobile Popup Image
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        ref={mobilePopupFileInputRef}
                        onChange={handleMobilePopupImageChange}
                      />
                    </Button>

                    {mobilePopupPreview && (
                      <Avatar
                        src={mobilePopupPreview}
                        variant="rounded"
                        sx={{ width: 96, height: 56 }}
                        className={cx("eventAdvertisement-preview-avatar")}
                      />
                    )}
                  </div>
                  {mobilePopupImageMeta && <span className={cx("eventAdvertisement-error-text")} style={{ color: "#6b7280", fontWeight: 400 }}>
                    Selected mobile image: {mobilePopupImageMeta.width} x {mobilePopupImageMeta.height} px -> saved as {MOBILE_HOME_POPUP_RULES.recommended}
                  </span>}
                  {errors.mobilePopupImage && (
                    <p className={cx("eventAdvertisement-error-text")}>
                      {errors.mobilePopupImage}
                    </p>
                  )}
                </div>

                <div>
                  <label>Auto-close Duration (seconds) <span style={{ fontWeight: 400, color: "#6b7280" }}>— 0 = manual close only</span></label>

                  <input
                    type="number"
                    name="popupAutoCloseDuration"
                    min="0"
                    step="1"
                    value={formData.popupAutoCloseDuration}
                    onChange={handleChange}
                  />
                </div>

                <div className={cx("eventAdvertisement-toggle")}>
                  <label htmlFor="eventAdvertisement-popupShowConfetti">
                    Show Confetti 🎉 <span style={{ fontWeight: 400, color: "#6b7280" }}>— burst confetti when popup opens</span>
                  </label>

                  <input
                    id="eventAdvertisement-popupShowConfetti"
                    type="checkbox"
                    name="popupShowConfetti"
                    checked={formData.popupShowConfetti}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

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
      </div>}

      {activeView === "list" && <>
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
      </>}

      <Dialog open={cropperOpen} onClose={handlePopupCropCancel} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Crop {cropData.cropType === "mobile" ? MOBILE_HOME_POPUP_RULES.title : HOME_POPUP_RULES.title}</span>
          <IconButton size="small" onClick={handlePopupCropCancel}>x</IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Box sx={{ mb: 2, p: 1.5, borderRadius: "8px", bgcolor: "#f8fafc", border: "1px solid #e5e7eb" }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#172033" }}>
              Forced output: {cropData.cropType === "mobile" ? MOBILE_HOME_POPUP_RULES.recommended : HOME_POPUP_RULES.recommended}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#6b7280" }}>
              Drag the image into the popup frame, then save the crop.
            </Typography>
            {cropData.dimensions && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#6b7280" }}>
                Source image: {cropData.dimensions.width} x {cropData.dimensions.height} px
              </Typography>
            )}
          </Box>

          {cropData.image && (
            <Box sx={{ position: "relative", width: "100%", height: { xs: 260, sm: 320, md: 380 }, bgcolor: "#0f172a", borderRadius: "8px", overflow: "hidden" }}>
              <Cropper
                image={cropData.image}
                crop={cropData.crop}
                zoom={cropData.zoom}
                aspect={(cropData.cropType === "mobile" ? MOBILE_HOME_POPUP_RULES.targetWidth : HOME_POPUP_RULES.targetWidth) / (cropData.cropType === "mobile" ? MOBILE_HOME_POPUP_RULES.targetHeight : HOME_POPUP_RULES.targetHeight)}
                onCropChange={crop => setCropData(prev => ({ ...prev, crop }))}
                onCropComplete={(croppedArea, croppedAreaPixels) => setCropData(prev => ({ ...prev, croppedAreaPixels }))}
                onZoomChange={zoom => setCropData(prev => ({ ...prev, zoom }))}
              />
            </Box>
          )}

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 1, color: "#6b7280" }}>
              Zoom: {(cropData.zoom * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={cropData.zoom}
              onChange={(event, zoom) => setCropData(prev => ({ ...prev, zoom }))}
              min={1}
              max={5}
              step={0.1}
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
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
