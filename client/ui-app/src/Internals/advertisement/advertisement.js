import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAllAdvertisements,
  createAdvertisement,
  editAdvertisement,
  deleteAdvertisement,
} from "../../redux/actions/advertisementAction";
import { businessCategorySearch } from "../../redux/actions/categoryAction";

import CustomizedTable from "../../components/Table/CustomizedTable";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import "./advertisement.css";

export default function AdvertisementPage() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);

  const { advertisements = [], total = 0, loading } =
    useSelector((state) => state.advertisement || {});

  const { searchCategory = [] } = useSelector(
    (state) => state.categoryReducer || {}
  );

  const [showCategorySuggest, setShowCategorySuggest] = useState(false);


  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    position: "LIST_INLINE",
    redirectUrl: "",
    startTime: "",
    endTime: "",
    bannerImage: "",
  });

  useEffect(() => {
    dispatch(getAllAdvertisements());
  }, [dispatch]);

  const convertToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await convertToBase64(file);
    setPreview(base64);
    setFormData((p) => ({ ...p, bannerImage: base64 }));
  };

  const validateForm = () => {
    let err = {};
    if (!formData.title.trim()) err.title = "Title is required";
    if (!formData.category.trim()) err.category = "Category is required";
    if (!formData.startTime) err.startTime = "Start time required";
    if (!formData.endTime) err.endTime = "End time required";
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
      bannerImage: "",
    });
    setPreview(null);
    setEditMode(false);
    setEditingId(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const action = editMode
      ? editAdvertisement(editingId, formData)
      : createAdvertisement(formData);

    dispatch(action).then(() => {
      resetForm();
      dispatch(getAllAdvertisements());
    });
  };

  const handleEdit = (row) => {
    setEditMode(true);
    setEditingId(row.id);
    setFormData({
      title: row.title,
      category: row.category,
      position: row.position,
      redirectUrl: row.redirectUrl || "",
      startTime: row.startTimeRaw,
      endTime: row.endTimeRaw,
      bannerImage: "",
    });
    setPreview(row.bannerImage || null);
  };

  const handleDelete = (row) => {
    if (window.confirm(`Delete "${row.title}" ?`)) {
      dispatch(deleteAdvertisement(row.id)).then(() =>
        dispatch(getAllAdvertisements())
      );
    }
  };

  const rows = advertisements.map((ad) => ({
    id: ad._id,
    title: ad.title,
    category: ad.category,
    position: ad.position,
    startTime: new Date(ad.startTime).toLocaleString(),
    endTime: new Date(ad.endTime).toLocaleString(),
    startTimeRaw: ad.startTime?.slice(0, 16),
    endTimeRaw: ad.endTime?.slice(0, 16),
    bannerImage: ad.bannerImage,
  }));

  const columns = [
    { id: "title", label: "Title" },
    { id: "category", label: "Category" },
    { id: "position", label: "Position" },
    { id: "startTime", label: "Start Time" },
    { id: "endTime", label: "End Time" },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div className="table-actions">
          <button onClick={() => handleEdit(row)}>
            <EditRoundedIcon fontSize="small" />
          </button>
          <button className="danger" onClick={() => handleDelete(row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="ads-page">
      <div className="ads-header">
        <h1>Advertisements</h1>
        <p>Create and manage banners across your platform</p>
      </div>

      <div className="ads-card">
        <h2>{editMode ? "Edit Advertisement" : "Create Advertisement"}</h2>

        <form className="ads-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label>Title</label>
            <input name="title" value={formData.title} onChange={handleChange} />
            {errors.title && <span className="error">{errors.title}</span>}
          </div>

          <div className="form-field" style={{ position: "relative" }}>
            <label>Category</label>

            <input
              type="text"
              name="category"
              value={formData.category}
              placeholder="Search category..."
              onChange={(e) => {
                const value = e.target.value;

                setFormData((prev) => ({
                  ...prev,
                  category: value, // ✅ only category string
                }));

                if (value.length >= 2) {
                  dispatch(businessCategorySearch(value));
                  setShowCategorySuggest(true);
                } else {
                  setShowCategorySuggest(false);
                }
              }}
              onFocus={() => {
                if (formData.category.length >= 2) {
                  setShowCategorySuggest(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowCategorySuggest(false), 200)}
            />

            {showCategorySuggest && searchCategory.length > 0 && (
              <ul
                style={{
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
                  listStyle: "none",
                }}
              >
                {searchCategory.map((cat) => (
                  <li
                    key={cat._id}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        category: cat.category,
                      }));
                      setShowCategorySuggest(false);
                    }}
                    style={{
                      padding: "10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {cat.category}
                  </li>
                ))}
              </ul>
            )}

            {errors.category && <span className="error">{errors.category}</span>}
          </div>


          <div className="form-field">
            <label>Position</label>
            <select
              name="position"
              value={formData.position}
              onChange={handleChange}
            >
              <option value="LIST_INLINE">List Inline</option>
              <option value="TOP_BANNER">Top Banner</option>
              <option value="SIDE_BANNER">Side Banner</option>
              <option value="FOOTER_BANNER">Footer Banner</option>
            </select>
          </div>

          <div className="form-field span-2">
            <label>Redirect URL</label>
            <input
              name="redirectUrl"
              value={formData.redirectUrl}
              onChange={handleChange}
            />
          </div>

          <div className="form-field upload">
            <label>Banner Image</label>
            <div className="upload-box">
              <button type="button" onClick={() => fileInputRef.current.click()}>
                <CloudUploadIcon fontSize="small" />
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              {preview && <img src={preview} alt="preview" />}
            </div>
          </div>

          <div className="form-field">
            <label>Start Time</label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
            />
          </div>

          <div className="form-field">
            <label>End Time</label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions span-3">
            <button type="submit" className="primary" disabled={loading}>
              {editMode ? "Update Advertisement" : "Create Advertisement"}
            </button>
            {editMode && (
              <button type="button" className="secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="ads-card">
        <h2>Advertisement List</h2>
        <CustomizedTable
          data={rows}
          columns={columns}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(getAllAdvertisements({ pageNo, pageSize, options }))
          }
        />
      </div>
    </div>
  );
}
