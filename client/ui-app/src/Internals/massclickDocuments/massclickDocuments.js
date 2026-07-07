import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Box, Chip } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import AdminViewTabs from "../../components/AdminViewTabs.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import {
  createMassclickDocument,
  deleteMassclickDocument,
  editMassclickDocument,
  getAllMassclickDocuments,
} from "../../redux/actions/massclickDocumentsAction.js";
import styles from "./massclickDocuments.module.css";

const cx = createScopedClassNames(styles);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const initialFormData = {
  title: "",
  section: "",
  description: "",
  resourceType: "document",
  summary: "",
  contentDetails: "",
  youtubeLinks: "",
  videoLinks: "",
  imageLinks: "",
  keyBenefits: "",
  useCases: "",
  targetAudience: "",
  displayOrder: 0,
  mediaFiles: [],
  existingMediaItems: [],
  documentFile: "",
  fileName: "",
  fileType: "",
  fileSize: 0,
  isActive: true,
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toDateTimeText = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function MassclickDocuments() {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const { documents = [], total = 0, loading } = useSelector(
    (state) => state.massclickDocuments || {}
  );

  const [activeView, setActiveView] = useState("list");
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedMediaNames, setSelectedMediaNames] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    dispatch(getAllMassclickDocuments());
  }, [dispatch]);

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedFileName("");
    setSelectedMediaNames([]);
    setErrors({});
    setEditMode(false);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        documentFile: "Primary file must be 15 MB or smaller",
      }));
      return;
    }

    const documentFile = await readFileAsDataUrl(file);
    setFormData((prev) => ({
      ...prev,
      documentFile,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
    }));
    setSelectedFileName(file.name);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.documentFile;
      return next;
    });
  };

  const handleMediaFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const mediaFiles = await Promise.all(
      files.map(async (file) => ({
        title: file.name,
        mediaFile: await readFileAsDataUrl(file),
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      }))
    );

    setFormData((prev) => ({
      ...prev,
      mediaFiles,
    }));
    setSelectedMediaNames(files.map((file) => file.name));
  };

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.title.trim()) nextErrors.title = "Title is required";
    if (!formData.section.trim()) nextErrors.section = "Section is required";
    const hasAnyResourceContent = Boolean(
      formData.documentFile ||
      formData.summary.trim() ||
      formData.contentDetails.trim() ||
      formData.youtubeLinks.trim() ||
      formData.videoLinks.trim() ||
      formData.imageLinks.trim() ||
      formData.keyBenefits.trim() ||
      formData.useCases.trim() ||
      formData.mediaFiles.length ||
      formData.existingMediaItems.length
    );
    if (!editMode && !hasAnyResourceContent) {
      nextErrors.documentFile = "Add a file, media upload, link, or awareness content";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const action = editMode
      ? editMassclickDocument(editingId, formData)
      : createMassclickDocument(formData);

    dispatch(action).then(() => {
      resetForm();
      setActiveView("list");
      dispatch(getAllMassclickDocuments());
    });
  };

  const handleEdit = (row) => {
    setEditMode(true);
    setEditingId(row.id);
    setActiveView("form");
    setSelectedFileName(row.fileName || "");
    setSelectedMediaNames((row.mediaItems || []).map((item) => item.fileName).filter(Boolean));
    setErrors({});
    setFormData({
      title: row.title || "",
      section: row.section || "",
      description: row.description || "",
      resourceType: row.resourceType || "document",
      summary: row.summary || "",
      contentDetails: row.contentDetails || "",
      youtubeLinks: (row.youtubeLinks || []).join("\n"),
      videoLinks: (row.videoLinks || []).join("\n"),
      imageLinks: (row.imageLinks || []).join("\n"),
      keyBenefits: (row.keyBenefits || []).join("\n"),
      useCases: (row.useCases || []).join("\n"),
      targetAudience: row.targetAudience || "",
      displayOrder: row.displayOrder || 0,
      mediaFiles: [],
      existingMediaItems: row.mediaItems || [],
      documentFile: "",
      fileName: row.fileName || "",
      fileType: row.fileType || "",
      fileSize: row.fileSize || 0,
      isActive: row.isActive,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (mediaInputRef.current) mediaInputRef.current.value = "";
  };

  const handleDelete = (row) => {
    if (window.confirm(`Delete "${row.title}"?`)) {
      dispatch(deleteMassclickDocument(row.id)).then(() =>
        dispatch(getAllMassclickDocuments())
      );
    }
  };

  const rows = documents.map((document) => ({
    _id: document._id,
    id: document._id,
    title: document.title,
    section: document.section,
    description: document.description,
    resourceType: document.resourceType || "document",
    summary: document.summary,
    contentDetails: document.contentDetails,
    youtubeLinks: document.youtubeLinks || [],
    videoLinks: document.videoLinks || [],
    imageLinks: document.imageLinks || [],
    keyBenefits: document.keyBenefits || [],
    useCases: document.useCases || [],
    targetAudience: document.targetAudience,
    displayOrder: document.displayOrder || 0,
    mediaItems: document.mediaItems || [],
    fileName: document.fileName,
    fileType: document.fileType,
    fileSize: document.fileSize,
    fileSizeText: formatFileSize(document.fileSize),
    documentUrl: document.documentUrl,
    status: document.isActive ? "Active" : "Inactive",
    isActive: document.isActive,
    createdAt: toDateTimeText(document.createdAt),
  }));

  const columns = [
    { id: "title", label: "Title" },
    { id: "resourceType", label: "Type" },
    { id: "section", label: "Section" },
    { id: "fileName", label: "Primary File" },
    { id: "fileSizeText", label: "Size" },
    {
      id: "status",
      label: "Status",
      renderCell: (value) => (
        <Chip
          label={value}
          color={value === "Active" ? "success" : "default"}
          size="small"
          variant="outlined"
        />
      ),
    },
    { id: "createdAt", label: "Created" },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <Box className={cx("table-actions")}>
          {row.documentUrl && (
            <a
              className={cx("action-link")}
              href={row.documentUrl}
              target="_blank"
              rel="noreferrer"
            >
              View
            </a>
          )}
          <EditOutlined
            onClick={() => handleEdit(row)}
            style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }}
          />
          <DeleteOutlined
            onClick={() => handleDelete(row)}
            style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }}
          />
        </Box>
      ),
    },
  ];

  return (
    <div className={cx("documents-page")}>
      <div className={cx("documents-header")}>
        <h1>Resource Hub</h1>
        <p>Manage MassClick guides, awareness content, YouTube links, videos, images, and downloadable files.</p>
      </div>

      <AdminViewTabs
        activeView={activeView}
        onChange={(view) => {
          setActiveView(view);
          if (view === "form" && !editMode) resetForm();
        }}
        isEditing={editMode}
        createLabel="Resource"
        listLabel="Resources"
        listCount={rows.length}
      />

      {activeView === "form" && (
        <div className={cx("documents-card")}>
          <h2>{editMode ? "Edit Resource" : "Create Resource"}</h2>

          <form className={cx("documents-form")} onSubmit={handleSubmit}>
            <div className={cx("form-field")}>
              <label>Title</label>
              <input name="title" value={formData.title} onChange={handleChange} />
              {errors.title && (
                <span className={cx("form-error-text")}>{errors.title}</span>
              )}
            </div>

            <div className={cx("form-field")}>
              <label>Section</label>
              <input
                name="section"
                value={formData.section}
                onChange={handleChange}
                placeholder="Example: Policies"
              />
              {errors.section && (
                <span className={cx("form-error-text")}>{errors.section}</span>
              )}
            </div>

            <div className={cx("form-field")}>
              <label>Resource Type</label>
              <select name="resourceType" value={formData.resourceType} onChange={handleChange}>
                <option value="document">Document</option>
                <option value="guide">Application Guide</option>
                <option value="awareness">Application Awareness</option>
                <option value="video">Video Resource</option>
                <option value="image">Image Resource</option>
              </select>
            </div>

            <div className={cx("form-field")}>
              <label>Display Order</label>
              <input type="number" name="displayOrder" value={formData.displayOrder} onChange={handleChange} />
            </div>

            <label className={cx("form-field checkbox-field")}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
              />
              Active
            </label>

            <div className={cx("form-field span-3")}>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Optional short note about this resource"
              />
            </div>

            <div className={cx("form-field span-3")}>
              <label>Short Summary</label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleChange}
                placeholder="One or two lines explaining this resource"
              />
            </div>

            <div className={cx("form-field span-3")}>
              <label>Application Awareness / Definitions</label>
              <textarea
                name="contentDetails"
                value={formData.contentDetails}
                onChange={handleChange}
                placeholder="Full explanation, definitions, workflow, project details, or awareness content"
              />
            </div>

            <div className={cx("form-field")}>
              <label>YouTube Links</label>
              <textarea
                name="youtubeLinks"
                value={formData.youtubeLinks}
                onChange={handleChange}
                placeholder="One YouTube link per line"
              />
            </div>

            <div className={cx("form-field")}>
              <label>Video Links</label>
              <textarea
                name="videoLinks"
                value={formData.videoLinks}
                onChange={handleChange}
                placeholder="One video link per line"
              />
            </div>

            <div className={cx("form-field")}>
              <label>Image Links</label>
              <textarea
                name="imageLinks"
                value={formData.imageLinks}
                onChange={handleChange}
                placeholder="One image link per line"
              />
            </div>

            <div className={cx("form-field")}>
              <label>Key Benefits</label>
              <textarea
                name="keyBenefits"
                value={formData.keyBenefits}
                onChange={handleChange}
                placeholder="One benefit per line"
              />
            </div>

            <div className={cx("form-field")}>
              <label>Use Cases</label>
              <textarea
                name="useCases"
                value={formData.useCases}
                onChange={handleChange}
                placeholder="One use case per line"
              />
            </div>

            <div className={cx("form-field")}>
              <label>Target Audience</label>
              <textarea
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder="Example: Business owners, sales teams, new users"
              />
            </div>

            <div className={cx("form-field upload-field")}>
              <label>Primary File</label>
              <p className={cx("upload-guidance")}>
                Upload PDF, Word, Excel, PowerPoint, text, or image files up to 15 MB.
              </p>
              <div className={cx("upload-box")}>
                <div className={cx("file-summary")}>
                  <span className={cx("file-name")}>
                    {selectedFileName || "No file selected"}
                  </span>
                  <span className={cx("file-meta")}>
                    {formData.fileSize ? formatFileSize(formData.fileSize) : "Choose a primary file to upload"}
                  </span>
                </div>
                <button
                  className={cx("upload-button")}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <CloudUploadIcon fontSize="small" />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />
              </div>
              {errors.documentFile && (
                <span className={cx("form-error-text")}>{errors.documentFile}</span>
              )}
            </div>

            <div className={cx("form-field upload-field")}>
              <label>Images / Videos / Extra Media</label>
              <p className={cx("upload-guidance")}>
                Upload supporting screenshots, walkthrough images, videos, or extra files for this resource.
              </p>
              <div className={cx("upload-box")}>
                <div className={cx("file-summary")}>
                  <span className={cx("file-name")}>
                    {selectedMediaNames.length ? selectedMediaNames.join(", ") : "No media selected"}
                  </span>
                  <span className={cx("file-meta")}>
                    {selectedMediaNames.length ? `${selectedMediaNames.length} media file(s)` : "Choose one or more media files"}
                  </span>
                </div>
                <button
                  className={cx("upload-button")}
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                >
                  <CloudUploadIcon fontSize="small" />
                  Choose Media
                </button>
                <input
                  ref={mediaInputRef}
                  hidden
                  multiple
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleMediaFilesChange}
                />
              </div>
            </div>

            <div className={cx("form-actions span-3")}>
              <button className={cx("primary-action")} type="submit" disabled={loading}>
                {editMode ? "Update Resource" : "Save Resource"}
              </button>
              {editMode && (
                <button
                  className={cx("secondary-action")}
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveView("list");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {activeView === "list" && (
        <div className={cx("documents-card")}>
          <h2>Resource Library</h2>
          <CustomizedTable
            title="Resources"
            data={rows}
            columns={columns}
            total={total}
            loading={loading}
            fetchData={(pageNo, pageSize, options) =>
              dispatch(getAllMassclickDocuments({ pageNo, pageSize, options }))
            }
          />
        </div>
      )}
    </div>
  );
}
