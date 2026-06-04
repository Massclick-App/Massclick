import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllAdvertisements, createAdvertisement, editAdvertisement, deleteAdvertisement } from "../../redux/actions/advertisementAction";
import { businessCategorySearch } from "../../redux/actions/categoryAction";
import CustomizedTable from "../../components/Table/CustomizedTable";
import Cropper from "react-easy-crop";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Slider, Typography } from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import styles from "./advertisement.module.css";
const cx = createScopedClassNames(styles);
const TOP_BANNER_RULES = {
  targetWidth: 1720,
  targetHeight: 168,
  recommended: "1720 x 168 px",
  label: "Choose a large image and crop it into the required 1720 x 168 px top banner frame."
};
const TOP_BANNER_RATIO = TOP_BANNER_RULES.targetWidth / TOP_BANNER_RULES.targetHeight;
const validateTopBannerDimensions = ({ width, height }) => {
  if (width < TOP_BANNER_RULES.targetWidth || height < TOP_BANNER_RULES.targetHeight) {
    return `Top banner image must be at least ${TOP_BANNER_RULES.recommended}.`;
  }

  return "";
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
const cropImageToTopBanner = (imageSource, croppedAreaPixels) => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous";

  image.onload = () => {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const targetWidth = TOP_BANNER_RULES.targetWidth;
    const targetHeight = TOP_BANNER_RULES.targetHeight;
    const {
      x,
      y,
      width,
      height
    } = croppedAreaPixels;

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
export default function AdvertisementPage() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const {
    advertisements = [],
    total = 0,
    loading
  } = useSelector(state => state.advertisement || {});
  const {
    searchCategory = []
  } = useSelector(state => state.categoryReducer || {});
  const [showCategorySuggest, setShowCategorySuggest] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropData, setCropData] = useState({
    image: null,
    dimensions: null,
    crop: {
      x: 0,
      y: 0
    },
    zoom: 1,
    croppedAreaPixels: null
  });
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    position: "LIST_INLINE",
    redirectUrl: "",
    startTime: "",
    endTime: "",
    bannerImage: ""
  });
  useEffect(() => {
    dispatch(getAllAdvertisements());
  }, [dispatch]);
  const convertToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === "position" ? { bannerImage: "" } : {})
    }));
    if (name === "position") {
      setPreview(null);
      setImageMeta(null);
      setCropperOpen(false);
      setCropData({
        image: null,
        dimensions: null,
        crop: {
          x: 0,
          y: 0
        },
        zoom: 1,
        croppedAreaPixels: null
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      setErrors(prev => {
        const next = {
          ...prev
        };
        delete next.bannerImage;
        return next;
      });
    }
  };
  const handleImageChange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    let dimensions;
    try {
      dimensions = await getImageDimensions(file);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        bannerImage: error.message
      }));
      return;
    }
    let bannerImage;
    let previewImage;
    if (formData.position === "TOP_BANNER") {
      const topBannerError = validateTopBannerDimensions(dimensions);
      if (topBannerError) {
        setPreview(null);
        setImageMeta(dimensions);
        setFormData(p => ({
          ...p,
          bannerImage: ""
        }));
        setErrors(prev => ({
          ...prev,
          bannerImage: topBannerError
        }));
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const sourceImage = await convertToBase64(file);
      setImageMeta(dimensions);
      setCropData({
        image: sourceImage,
        dimensions,
        crop: {
          x: 0,
          y: 0
        },
        zoom: 1,
        croppedAreaPixels: null
      });
      setCropperOpen(true);
      return;
    } else {
      bannerImage = await convertToBase64(file);
      previewImage = bannerImage;
    }
    setPreview(previewImage);
    setImageMeta(dimensions);
    setErrors(prev => {
      const next = {
        ...prev
      };
      delete next.bannerImage;
      return next;
    });
    setFormData(p => ({
      ...p,
      bannerImage
    }));
  };
  const handleTopBannerCropSave = async () => {
    if (!cropData.image || !cropData.croppedAreaPixels) {
      setErrors(prev => ({
        ...prev,
        bannerImage: "Please adjust the top banner crop before saving"
      }));
      return;
    }

    try {
      const cropped = await cropImageToTopBanner(cropData.image, cropData.croppedAreaPixels);
      setPreview(cropped.base64);
      setImageMeta({
        width: cropped.originalWidth,
        height: cropped.originalHeight
      });
      setFormData(p => ({
        ...p,
        bannerImage: cropped.base64
      }));
      setErrors(prev => {
        const next = {
          ...prev
        };
        delete next.bannerImage;
        return next;
      });
      setCropperOpen(false);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        bannerImage: error.message
      }));
    }
  };
  const handleTopBannerCropCancel = () => {
    setCropperOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const validateForm = () => {
    let err = {};
    if (!formData.title.trim()) err.title = "Title is required";
    if (!formData.category.trim()) err.category = "Category is required";
    if (!formData.startTime) err.startTime = "Start time required";
    if (!formData.endTime) err.endTime = "End time required";
    if (!editMode && !formData.bannerImage) err.bannerImage = "Banner image is required";
    if (formData.position === "TOP_BANNER" && !formData.bannerImage && !preview) {
      err.bannerImage = "Top banner image is required";
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };
  const resetForm = () => {
    setFormData({
      title: "",
      category: "",
      position: "LIST_INLINE",
      redirectUrl: "",
      startTime: "",
      endTime: "",
      bannerImage: ""
    });
    setPreview(null);
    setImageMeta(null);
    setCropperOpen(false);
    setCropData({
      image: null,
      dimensions: null,
      crop: {
        x: 0,
        y: 0
      },
      zoom: 1,
      croppedAreaPixels: null
    });
    setEditMode(false);
    setEditingId(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) return;
    const action = editMode ? editAdvertisement(editingId, formData) : createAdvertisement(formData);
    dispatch(action).then(() => {
      resetForm();
      dispatch(getAllAdvertisements());
    });
  };
  const handleEdit = row => {
    setEditMode(true);
    setEditingId(row.id);
    setFormData({
      title: row.title,
      category: row.category,
      position: row.position,
      redirectUrl: row.redirectUrl || "",
      startTime: row.startTimeRaw,
      endTime: row.endTimeRaw,
      bannerImage: ""
    });
    setPreview(row.bannerImage || null);
    setImageMeta(null);
  };
  const handleDelete = row => {
    if (window.confirm(`Delete "${row.title}" ?`)) {
      dispatch(deleteAdvertisement(row.id)).then(() => dispatch(getAllAdvertisements()));
    }
  };
  const rows = advertisements.map(ad => ({
    id: ad._id,
    title: ad.title,
    category: ad.category,
    position: ad.position,
    startTime: new Date(ad.startTime).toLocaleString(),
    endTime: new Date(ad.endTime).toLocaleString(),
    startTimeRaw: ad.startTime?.slice(0, 16),
    endTimeRaw: ad.endTime?.slice(0, 16),
    bannerImage: ad.bannerImage
  }));
  const columns = [{
    id: "title",
    label: "Title"
  }, {
    id: "category",
    label: "Category"
  }, {
    id: "position",
    label: "Position"
  }, {
    id: "startTime",
    label: "Start Time"
  }, {
    id: "endTime",
    label: "End Time"
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => <div className={cx("table-actions")}>
          <button onClick={() => handleEdit(row)}>
            <EditRoundedIcon fontSize="small" />
          </button>
          <button className={cx("danger")} onClick={() => handleDelete(row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </button>
        </div>
  }];
  const isTopBanner = formData.position === "TOP_BANNER";
  return <div className={cx("ads-page")}>
      <div className={cx("ads-header")}>
        <h1>Advertisements</h1>
        <p>Create and manage banners across your platform</p>
      </div>

      <div className={cx("ads-card")}>
        <h2>{editMode ? "Edit Advertisement" : "Create Advertisement"}</h2>

        <form className={cx("ads-form")} onSubmit={handleSubmit}>
          <div className={cx("form-field")}>
            <label>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} />
            {errors.title && <span className={cx("error")}>{errors.title}</span>}
          </div>

          <div className={cx("form-field")} style={{
          position: "relative"
        }}>
            <label>Category</label>

            <input type="text" name="category" value={formData.category} placeholder="Search category..." onChange={e => {
            const value = e.target.value;
            setFormData(prev => ({
              ...prev,
              category: value // ✅ only category string
            }));
            if (value.length >= 2) {
              dispatch(businessCategorySearch(value));
              setShowCategorySuggest(true);
            } else {
              setShowCategorySuggest(false);
            }
          }} onFocus={() => {
            if (formData.category.length >= 2) {
              setShowCategorySuggest(true);
            }
          }} onBlur={() => setTimeout(() => setShowCategorySuggest(false), 200)} />

            {showCategorySuggest && searchCategory.length > 0 && <ul style={{
            position: "absolute",
            top: "70px",
            width: "100%",
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: "6px",
            maxHeight: "200px",
            overflowY: "auto",
            padding: 0,
            margin: 0,
            zIndex: 2000,
            listStyle: "none"
          }}>
                {searchCategory.map(cat => <li key={cat._id} onClick={() => {
              setFormData(prev => ({
                ...prev,
                category: cat.category
              }));
              setShowCategorySuggest(false);
            }} style={{
              padding: "10px",
              cursor: "pointer",
              borderBottom: "1px solid #eee"
            }}>
                    {cat.category}
                  </li>)}
              </ul>}

            {errors.category && <span className={cx("error")}>{errors.category}</span>}
          </div>


          <div className={cx("form-field")}>
            <label>Position</label>
            <select name="position" value={formData.position} onChange={handleChange}>
              <option value="LIST_INLINE">List Inline</option>
              <option value="TOP_BANNER">Top Banner</option>
              <option value="SIDE_BANNER">Side Banner</option>
              <option value="FOOTER_BANNER">Footer Banner</option>
            </select>
          </div>

          <div className={cx("form-field span-2")}>
            <label>Redirect URL</label>
            <input name="redirectUrl" value={formData.redirectUrl} onChange={handleChange} />
          </div>

          <div className={cx("form-field upload")}>
            <label>Banner Image</label>
            <p className={cx("upload-guidance")}>
              {isTopBanner ? TOP_BANNER_RULES.label : "Upload a clear JPG, PNG or WEBP banner image."}
            </p>
            <div className={cx("upload-box")}>
              <button type="button" onClick={() => fileInputRef.current.click()}>
                <CloudUploadIcon fontSize="small" />
                Upload Image
              </button>
              <input ref={fileInputRef} hidden type="file" accept="image/*" onChange={handleImageChange} />
            </div>
            {preview && <div className={cx("banner-preview", isTopBanner && "top-banner-preview")}>
                <span>Preview</span>
                <img src={preview} alt="preview" />
              </div>}
            {imageMeta && <span className={cx("image-meta")}>
                Selected image: {imageMeta.width} x {imageMeta.height} px
                {isTopBanner ? ` -> saved as ${TOP_BANNER_RULES.recommended}` : ""}
              </span>}
            {errors.bannerImage && <span className={cx("error")}>{errors.bannerImage}</span>}
          </div>

          <div className={cx("form-field")}>
            <label>Start Time</label>
            <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} />
          </div>

          <div className={cx("form-field")}>
            <label>End Time</label>
            <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} />
          </div>

          <div className={cx("form-actions span-3")}>
            <button type="submit" className={cx("primary")} disabled={loading}>
              {editMode ? "Update Advertisement" : "Create Advertisement"}
            </button>
            {editMode && <button type="button" className={cx("secondary")} onClick={resetForm}>
                Cancel
              </button>}
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className={cx("ads-card")}>
        <h2>Advertisement List</h2>
        <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(getAllAdvertisements({
        pageNo,
        pageSize,
        options
      }))} />
      </div>

      <Dialog open={cropperOpen} onClose={handleTopBannerCropCancel} maxWidth="md" fullWidth>
        <DialogTitle sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
          <span>Crop Top Banner</span>
          <IconButton size="small" onClick={handleTopBannerCropCancel}>x</IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{
        p: 2
      }}>
          <Box sx={{
          mb: 2,
          p: 1.5,
          borderRadius: "8px",
          bgcolor: "#f8fafc",
          border: "1px solid #e5e7eb"
        }}>
            <Typography variant="body2" sx={{
            fontWeight: 700,
            color: "#172033"
          }}>
              Forced output: {TOP_BANNER_RULES.recommended}
            </Typography>
            <Typography variant="caption" sx={{
            display: "block",
            mt: 0.5,
            color: "#6b7280"
          }}>
              Drag the image into the long banner frame, then save the crop.
            </Typography>
            {cropData.dimensions && <Typography variant="caption" sx={{
            display: "block",
            mt: 0.5,
            color: "#6b7280"
          }}>
                Source image: {cropData.dimensions.width} x {cropData.dimensions.height} px
              </Typography>}
          </Box>

          {cropData.image && <Box sx={{
          position: "relative",
          width: "100%",
          height: {
            xs: 260,
            sm: 320,
            md: 380
          },
          bgcolor: "#0f172a",
          borderRadius: "8px",
          overflow: "hidden"
        }}>
              <Cropper image={cropData.image} crop={cropData.crop} zoom={cropData.zoom} aspect={TOP_BANNER_RATIO} onCropChange={crop => setCropData(prev => ({
            ...prev,
            crop
          }))} onCropComplete={(croppedArea, croppedAreaPixels) => setCropData(prev => ({
            ...prev,
            croppedAreaPixels
          }))} onZoomChange={zoom => setCropData(prev => ({
            ...prev,
            zoom
          }))} />
            </Box>}

          <Box sx={{
          mt: 2
        }}>
            <Typography variant="caption" sx={{
            display: "block",
            mb: 1,
            color: "#6b7280"
          }}>
              Zoom: {(cropData.zoom * 100).toFixed(0)}%
            </Typography>
            <Slider value={cropData.zoom} onChange={(event, zoom) => setCropData(prev => ({
            ...prev,
            zoom
          }))} min={1} max={5} step={0.1} valueLabelDisplay="auto" />
          </Box>
        </DialogContent>
        <DialogActions sx={{
        p: 2
      }}>
          <Button onClick={handleTopBannerCropCancel}>Cancel</Button>
          <Button variant="contained" onClick={handleTopBannerCropSave}>
            Save Crop
          </Button>
        </DialogActions>
      </Dialog>
    </div>;
}
