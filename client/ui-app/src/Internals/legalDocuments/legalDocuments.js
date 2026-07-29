import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { createScopedClassNames } from "../../utils/createScopedClassNames";
import { useSnackbar } from "../../components/snackbar/SnackbarProvider.js";
import {
  createLegalDocument,
  createLegalDocumentVersion,
  deleteLegalDocument,
  editLegalDocument,
  getAllLegalDocuments,
  publishLegalDocument,
} from "../../redux/actions/legalDocumentsAction.js";
import styles from "./legalDocuments.module.css";

const cx = createScopedClassNames(styles);

const DOCUMENT_TYPES = [
  { value: "privacy-policy", label: "Privacy Policy", publicPath: "/privacy" },
  { value: "terms-and-conditions", label: "Terms & Conditions", publicPath: "/terms" },
  { value: "refund-policy", label: "Refund Policy", publicPath: "/refund" },
];

const STATUS_COLORS = {
  published: "success",
  draft: "warning",
  archived: "default",
};

const quillModules = {
  toolbar: [
    [{ header: [2, 3, 4, false] }],
    ["bold", "italic", "underline"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "list",
  "bullet",
  "link",
];

const emptySection = () => ({ heading: "", body: "" });

const toDateInput = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString().slice(0, 10)
    : parsed.toISOString().slice(0, 10);
};

const blankForm = (type) => ({
  type,
  title: DOCUMENT_TYPES.find((item) => item.value === type)?.label || "",
  summary: "",
  effectiveDate: new Date().toISOString().slice(0, 10),
  contactEmail: "support@massclick.in",
  changeNote: "",
  sections: [emptySection()],
});

const formFromDocument = (document) => ({
  type: document.type,
  title: document.title || "",
  summary: document.summary || "",
  effectiveDate: toDateInput(document.effectiveDate),
  contactEmail: document.contactEmail || "",
  changeNote: document.changeNote || "",
  sections: document.sections?.length
    ? document.sections.map((section) => ({
        key: section.key,
        heading: section.heading,
        body: section.body,
      }))
    : [emptySection()],
});

export default function LegalDocuments() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const {
    documents = [],
    loading = false,
    saving = false,
  } = useSelector((state) => state.legalDocuments) || {};

  const [activeType, setActiveType] = useState(DOCUMENT_TYPES[0].value);
  const [activeView, setActiveView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(() => blankForm(DOCUMENT_TYPES[0].value));
  const [confirm, setConfirm] = useState(null);

  const refresh = useCallback(
    (type) =>
      dispatch(getAllLegalDocuments({ type, pageSize: 100 })).catch((error) => {
        enqueueSnackbar(
          error?.response?.data?.message || "Failed to load legal documents",
          { variant: "error" }
        );
      }),
    [dispatch, enqueueSnackbar]
  );

  useEffect(() => {
    refresh(activeType);
  }, [refresh, activeType]);

  const versions = useMemo(
    () =>
      [...documents]
        .filter((document) => document.type === activeType)
        .sort((a, b) => b.version - a.version),
    [documents, activeType]
  );

  const publishedVersion = versions.find((item) => item.status === "published");
  const draftVersion = versions.find((item) => item.status === "draft");
  const activeTypeMeta = DOCUMENT_TYPES.find((item) => item.value === activeType);

  const switchType = (type) => {
    setActiveType(type);
    setActiveView("list");
    setEditingId(null);
    setFormData(blankForm(type));
  };

  const startNewDocument = () => {
    setEditingId(null);
    setFormData(blankForm(activeType));
    setActiveView("form");
  };

  const startEditingDraft = (document) => {
    setEditingId(document._id);
    setFormData(formFromDocument(document));
    setActiveView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateField = (field, value) =>
    setFormData((previous) => ({ ...previous, [field]: value }));

  const updateSection = (index, field, value) =>
    setFormData((previous) => ({
      ...previous,
      sections: previous.sections.map((section, i) =>
        i === index ? { ...section, [field]: value } : section
      ),
    }));

  const addSection = () =>
    setFormData((previous) => ({
      ...previous,
      sections: [...previous.sections, emptySection()],
    }));

  const removeSection = (index) =>
    setFormData((previous) => {
      const sections = previous.sections.filter((_, i) => i !== index);
      return { ...previous, sections: sections.length ? sections : [emptySection()] };
    });

  const moveSection = (index, direction) =>
    setFormData((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.sections.length) return previous;

      const sections = [...previous.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...previous, sections };
    });

  const handleSubmit = async (event) => {
    event.preventDefault();

    const sections = formData.sections
      .map((section, index) => ({
        ...section,
        heading: section.heading?.trim() || "",
        body: section.body?.trim() || "",
        order: index,
      }))
      .filter(
        (section) =>
          section.heading && section.body && section.body !== "<p><br></p>"
      );

    if (!formData.title.trim()) {
      enqueueSnackbar("Title is required", { variant: "warning" });
      return;
    }

    if (!sections.length) {
      enqueueSnackbar("Add at least one section with a heading and body", {
        variant: "warning",
      });
      return;
    }

    const payload = { ...formData, sections };

    try {
      if (editingId) {
        await dispatch(editLegalDocument(editingId, payload));
        enqueueSnackbar("Draft saved", { variant: "success" });
      } else {
        await dispatch(createLegalDocument(payload));
        enqueueSnackbar("Draft created — publish it when you are ready", {
          variant: "success",
        });
      }
      await refresh(activeType);
      setActiveView("list");
      setEditingId(null);
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message || "Failed to save the document",
        { variant: "error" }
      );
    }
  };

  const runAction = async (action, successMessage, fallbackMessage) => {
    try {
      const response = await action();
      enqueueSnackbar(response?.message || successMessage, { variant: "success" });
      await refresh(activeType);
      return true;
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message || fallbackMessage,
        { variant: "error" }
      );
      return false;
    }
  };

  const handleNewVersion = (document) =>
    runAction(
      () => dispatch(createLegalDocumentVersion(document._id)),
      "Draft created",
      "Failed to create a new version"
    );

  const handlePublish = (document) =>
    runAction(
      () => dispatch(publishLegalDocument(document._id)),
      "Document published",
      "Failed to publish"
    );

  const handleDelete = (document) =>
    runAction(
      () => dispatch(deleteLegalDocument(document._id)),
      "Draft deleted",
      "Failed to delete"
    );

  const askConfirm = (config) => setConfirm(config);

  const confirmAndClose = async () => {
    const pending = confirm;
    setConfirm(null);
    if (pending) await pending.onConfirm();
  };

  return (
    <div className={cx("legal-page")}>
      <div className={cx("legal-container")}>
        <header className={cx("legal-header")}>
          <div>
            <h1>Legal Documents</h1>
            <p>
              Published wording is what the website and mobile app show. Edits are
              made on a draft and go live only when you publish.
            </p>
          </div>
          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={() => refresh(activeType)}
            disabled={loading}
          >
            Refresh
          </Button>
        </header>

        <Tabs
          value={activeType}
          onChange={(_, value) => switchType(value)}
          className={cx("legal-tabs")}
          variant="scrollable"
          scrollButtons="auto"
        >
          {DOCUMENT_TYPES.map((type) => (
            <Tab key={type.value} value={type.value} label={type.label} />
          ))}
        </Tabs>

        {activeView === "list" && (
          <>
            <div className={cx("legal-status-bar")}>
              <div className={cx("legal-status-item")}>
                <span className={cx("legal-status-label")}>Live now</span>
                {publishedVersion ? (
                  <span className={cx("legal-status-value")}>
                    v{publishedVersion.version} · effective{" "}
                    {new Date(publishedVersion.effectiveDate).toLocaleDateString()}
                  </span>
                ) : (
                  <span className={cx("legal-status-value legal-status-empty")}>
                    Nothing published
                  </span>
                )}
              </div>

              <div className={cx("legal-status-item")}>
                <span className={cx("legal-status-label")}>Open draft</span>
                {draftVersion ? (
                  <span className={cx("legal-status-value")}>
                    v{draftVersion.version}
                  </span>
                ) : (
                  <span className={cx("legal-status-value legal-status-empty")}>
                    None
                  </span>
                )}
              </div>

              <div className={cx("legal-status-actions")}>
                {activeTypeMeta?.publicPath && (
                  <Button
                    variant="text"
                    startIcon={<VisibilityOutlinedIcon />}
                    href={activeTypeMeta.publicPath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View public page
                  </Button>
                )}

                {draftVersion ? (
                  <Button
                    variant="contained"
                    startIcon={<EditOutlined />}
                    onClick={() => startEditingDraft(draftVersion)}
                  >
                    Edit draft v{draftVersion.version}
                  </Button>
                ) : publishedVersion ? (
                  <Button
                    variant="contained"
                    startIcon={<ContentCopyRoundedIcon />}
                    disabled={saving}
                    onClick={() => handleNewVersion(publishedVersion)}
                  >
                    Amend — new draft from v{publishedVersion.version}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={startNewDocument}
                  >
                    Create {activeTypeMeta?.label}
                  </Button>
                )}
              </div>
            </div>

            <div className={cx("legal-table-wrapper")}>
              {loading && !versions.length ? (
                <div className={cx("legal-empty")}>
                  <CircularProgress size={26} />
                </div>
              ) : !versions.length ? (
                <div className={cx("legal-empty")}>
                  No versions yet for {activeTypeMeta?.label}.
                </div>
              ) : (
                <table className={cx("legal-table")}>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Status</th>
                      <th>Effective</th>
                      <th>Sections</th>
                      <th>Change note</th>
                      <th>Last updated</th>
                      <th className={cx("legal-col-actions")}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((document) => (
                      <tr key={document._id}>
                        <td className={cx("legal-cell-version")}>
                          v{document.version}
                        </td>
                        <td>
                          <Chip
                            size="small"
                            label={document.status}
                            color={STATUS_COLORS[document.status] || "default"}
                            variant={
                              document.status === "archived" ? "outlined" : "filled"
                            }
                          />
                        </td>
                        <td>
                          {new Date(document.effectiveDate).toLocaleDateString()}
                        </td>
                        <td>{document.sections?.length || 0}</td>
                        <td className={cx("legal-cell-note")}>
                          {document.changeNote || "—"}
                        </td>
                        <td>
                          {document.updatedAt
                            ? new Date(document.updatedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td>
                          <Box
                            sx={{ display: "flex", gap: "12px", alignItems: "center" }}
                          >
                            {document.status === "draft" && (
                              <>
                                <Tooltip title="Edit draft">
                                  <EditOutlined
                                    onClick={() => startEditingDraft(document)}
                                    style={{
                                      fontSize: 17,
                                      color: "#3b82f6",
                                      cursor: "pointer",
                                    }}
                                  />
                                </Tooltip>
                                <Tooltip title="Publish — makes this the live version">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    disabled={saving}
                                    onClick={() =>
                                      askConfirm({
                                        title: `Publish v${document.version}?`,
                                        body: publishedVersion
                                          ? `This replaces v${publishedVersion.version} everywhere — website, mobile app and API. v${publishedVersion.version} is archived, not deleted.`
                                          : "This becomes the live version on the website, mobile app and API.",
                                        confirmLabel: "Publish",
                                        confirmColor: "success",
                                        onConfirm: () => handlePublish(document),
                                      })
                                    }
                                  >
                                    <PublishRoundedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete draft">
                                  <DeleteOutlined
                                    onClick={() =>
                                      askConfirm({
                                        title: `Delete draft v${document.version}?`,
                                        body: "The draft and its edits are removed. Published and archived versions are unaffected.",
                                        confirmLabel: "Delete",
                                        confirmColor: "error",
                                        onConfirm: () => handleDelete(document),
                                      })
                                    }
                                    style={{
                                      fontSize: 17,
                                      color: "#ef4444",
                                      cursor: "pointer",
                                    }}
                                  />
                                </Tooltip>
                              </>
                            )}

                            {document.status !== "draft" && (
                              <Tooltip
                                title={
                                  draftVersion
                                    ? "Close the open draft first"
                                    : "Copy into a new editable draft"
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={saving || Boolean(draftVersion)}
                                    onClick={() => handleNewVersion(document)}
                                  >
                                    <ContentCopyRoundedIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Box>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeView === "form" && (
          <div className={cx("legal-card")}>
            <header className={cx("legal-card-header")}>
              <h2>
                {editingId
                  ? `Edit draft — ${activeTypeMeta?.label}`
                  : `New ${activeTypeMeta?.label}`}
              </h2>
              <Button variant="outlined" onClick={() => setActiveView("list")}>
                Back to versions
              </Button>
            </header>

            <form onSubmit={handleSubmit}>
              <div className={cx("legal-field-grid")}>
                <label className={cx("legal-field")}>
                  <span>Title</span>
                  <input
                    className={cx("legal-input")}
                    value={formData.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Privacy Policy"
                  />
                </label>

                <label className={cx("legal-field")}>
                  <span>Effective date</span>
                  <input
                    type="date"
                    className={cx("legal-input")}
                    value={formData.effectiveDate}
                    onChange={(event) =>
                      updateField("effectiveDate", event.target.value)
                    }
                  />
                </label>

                <label className={cx("legal-field")}>
                  <span>Grievance / contact email</span>
                  <input
                    className={cx("legal-input")}
                    value={formData.contactEmail}
                    onChange={(event) =>
                      updateField("contactEmail", event.target.value)
                    }
                    placeholder="support@massclick.in"
                  />
                </label>

                <label className={cx("legal-field")}>
                  <span>Change note (internal audit trail)</span>
                  <input
                    className={cx("legal-input")}
                    value={formData.changeNote}
                    onChange={(event) =>
                      updateField("changeNote", event.target.value)
                    }
                    placeholder="Added DPDP grievance timelines"
                  />
                </label>
              </div>

              <label className={cx("legal-field legal-field-wide")}>
                <span>Summary — the lead-in paragraph shown above the sections</span>
                <textarea
                  className={cx("legal-textarea")}
                  rows={3}
                  value={formData.summary}
                  onChange={(event) => updateField("summary", event.target.value)}
                />
              </label>

              <div className={cx("legal-toolbar")}>
                <h3>Sections ({formData.sections.length})</h3>
                <Button
                  type="button"
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={addSection}
                >
                  Add section
                </Button>
              </div>

              <div className={cx("legal-sections")}>
                {formData.sections.map((section, index) => (
                  <div className={cx("legal-section")} key={index}>
                    <div className={cx("legal-section-head")}>
                      <span className={cx("legal-section-index")}>{index + 1}</span>
                      <input
                        className={cx("legal-input")}
                        placeholder="Section heading"
                        value={section.heading || ""}
                        onChange={(event) =>
                          updateSection(index, "heading", event.target.value)
                        }
                      />
                      <div className={cx("legal-section-tools")}>
                        <IconButton
                          type="button"
                          size="small"
                          disabled={index === 0}
                          onClick={() => moveSection(index, -1)}
                        >
                          <ArrowUpwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="small"
                          disabled={index === formData.sections.length - 1}
                          onClick={() => moveSection(index, 1)}
                        >
                          <ArrowDownwardRoundedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="small"
                          onClick={() => removeSection(index)}
                        >
                          <DeleteOutlined style={{ fontSize: 16, color: "#ef4444" }} />
                        </IconButton>
                      </div>
                    </div>

                    <div className={cx("legal-editor")}>
                      <ReactQuill
                        value={section.body || ""}
                        onChange={(value) => updateSection(index, "body", value)}
                        modules={quillModules}
                        formats={quillFormats}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={cx("legal-actionbar")}>
                <span className={cx("legal-actionbar-hint")}>
                  Saving keeps this a draft. Publish it from the versions list.
                </span>
                <button
                  type="submit"
                  className={cx("legal-submit")}
                  disabled={saving}
                >
                  {saving ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : editingId ? (
                    "Save draft"
                  ) : (
                    "Create draft"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)}>
          <DialogTitle>{confirm?.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{confirm?.body}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant="contained"
              color={confirm?.confirmColor || "primary"}
              onClick={confirmAndClose}
            >
              {confirm?.confirmLabel || "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
