import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllAdvertisements, createAdvertisement, editAdvertisement, deleteAdvertisement } from "../../redux/actions/advertisementAction";
import { businessCategorySearch } from "../../redux/actions/categoryAction";
import CustomizedTable from "../../components/Table/CustomizedTable";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import styles from "./advertisement.module.css";
const cx = createScopedClassNames(styles);
const TOP_BANNER_RULES = {
  targetWidth: 1440,
  targetHeight: 150,
  recommended: "1440 x 150 px",
  label: "Top banner output is forced to 1440 x 150 px. Uploaded images are center-cropped to fit the slim banner frame."
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
      [name]: value
    }));
    if (name === "position") {
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
    const base64 = await convertToBase64(file);
    setPreview(base64);
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
      bannerImage: base64
    }));
  };
  const validateForm = () => {
    let err = {};
    if (!formData.title.trim()) err.title = "Title is required";
    if (!formData.category.trim()) err.category = "Category is required";
    if (!formData.startTime) err.startTime = "Start time required";
    if (!formData.endTime) err.endTime = "End time required";
    if (!editMode && !formData.bannerImage) err.bannerImage = "Banner image is required";
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
                {isTopBanner ? ` -> saved as ${TOP_BANNER_RULES.targetWidth} x ${TOP_BANNER_RULES.targetHeight} px` : ""}
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
    </div>;
}
