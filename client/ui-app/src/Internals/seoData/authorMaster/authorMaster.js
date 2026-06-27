import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllAuthors,
  createAuthor,
  updateAuthor,
  deleteAuthor,
} from "../../../redux/actions/authorMasterAction.js";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Drawer,
  Typography,
  Divider,
} from "@mui/material";
import { EditOutlined, DeleteOutlined, PlusOutlined, EyeOutlined } from "@ant-design/icons";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CustomizedTable from "../../../components/Table/CustomizedTable.js";
import styles from "./authorMaster.module.css";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import AdminViewTabs from "../../../components/AdminViewTabs.js";

const cx = createScopedClassNames(styles);

const defaultForm = {
  displayName: "",
  title: "",
  shortBio: "",
  bio: "",
  experience: "",
  expertCategory: "",
  expertiseAreas: [],
  specializations: [],
  email: "",
  phone: "",
  website: "",
  linkedin: "",
  twitter: "",
};

export default function AuthorMaster() {
  const dispatch = useDispatch();
  const { list = [], loading = false } = useSelector(
    (state) => state.authorMasterReducer || {}
  );
  const fetchAdminAuthors = () => dispatch(fetchAllAuthors({ includeInactive: "true" }));

  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailDrawer, setDetailDrawer] = useState(null);

  useEffect(() => {
    dispatch(fetchAllAuthors({ includeInactive: "true" }));
  }, [dispatch]);

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.displayName.trim()) {
      alert("Author name is required");
      return;
    }

    try {
      if (editingId) {
        await dispatch(updateAuthor(editingId, formData));
      } else {
        await dispatch(createAuthor(formData));
      }

      resetForm();
      fetchAdminAuthors();
      setActiveView("list");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const handleEdit = (rowId) => {
    const found = list.find((x) => x._id === rowId);
    if (!found) return;

    setEditingId(rowId);
    setActiveView("form");
    setFormData({
      displayName: found.displayName || "",
      email: found.email || "",
      website: found.website || "",
      linkedin: found.linkedin || "",
      title: found.title || "",
      bio: found.bio || "",
      shortBio: found.shortBio || "",
      experience: found.experience || "",
      expertCategory: found.expertCategory || "",
      phone: found.phone || "",
      twitter: found.twitter || "",
      expertiseAreas: found.expertiseAreas || [],
      specializations: found.specializations || [],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleView = (rowId) => {
    const found = list.find((x) => x._id === rowId);
    if (!found) return;
    setDetailDrawer(found);
  };

  const handleOpenPage = (rowId) => {
    const found = list.find((x) => x._id === rowId);
    if (!found) return;
    const authorSlug = found.slug || found.displayName.toLowerCase().replace(/\s+/g, "-");
    window.open(`/author/${authorSlug}`, "_blank");
  };

  const rows = list.map((author) => ({
    id: author._id,
    displayName: author.displayName,
    email: author.email || "-",
    blogCount: author.blogCount || 0,
    status: author.isActive ? "Active" : "Inactive",
  }));

  const columns = [
    {
      id: "displayName",
      label: "Author Name",
    },
    {
      id: "email",
      label: "Email",
    },
    {
      id: "blogCount",
      label: "Blogs",
      renderCell: (_, row) => (
        <Chip label={row.blogCount} size="small" variant="outlined" />
      ),
    },
    {
      id: "status",
      label: "Status",
      renderCell: (_, row) => (
        <Chip
          size="small"
          label={row.status}
          color={row.status === "Active" ? "success" : "default"}
        />
      ),
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
          <EyeOutlined
            onClick={() => handleView(row.id)}
            style={{ fontSize: 17, color: "#8b5cf6", cursor: "pointer" }}
            title="View Details (Drawer)"
          />
          <OpenInNewIcon
            onClick={() => handleOpenPage(row.id)}
            title="Open Author Page"
            sx={{ fontSize: 17, color: "#10b981", cursor: "pointer" }}
          />
          <EditOutlined
            onClick={() => handleEdit(row.id)}
            style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }}
            title="Edit Author"
          />
          <DeleteOutlined
            onClick={() => {
              setSelectedRow(row);
              setDeleteDialogOpen(true);
            }}
            style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }}
            title="Delete Author"
          />
        </Box>
      ),
    },
  ];

  return (
    <div className={cx("author-shell")}>
      <div className={cx("author-container")}>
        <header className={cx("author-header")}>
          <div>
            <h1>
              {editingId ? "Edit Author" : "Create New Author"}
            </h1>
            <p>Manage SEO blog authors</p>
          </div>

          <Button
            variant="outlined"
            startIcon={<PlusOutlined />}
            onClick={resetForm}
          >
            New Author
          </Button>
        </header>

        <AdminViewTabs
          activeView={activeView}
          onChange={setActiveView}
          isEditing={Boolean(editingId)}
          createLabel="Author Form"
          listLabel="Authors"
          listCount={rows.length}
        />

        {activeView === "form" && (
          <form className={cx("author-form")} onSubmit={handleSubmit}>
            <section className={cx("form-card", "premium-card")}>
              <h2 className={cx("section-title")}>👤 Basic Information</h2>

              <div className={cx("meta-card")}>
                <div className={cx("floating-field")}>
                  <input
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayName: e.target.value,
                      })
                    }
                    placeholder=" "
                    required
                  />
                  <label>Author Name *</label>
                </div>

                <div className={cx("floating-field")}>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>Email</label>
                </div>
              </div>

              <div className={cx("meta-card")}>
                <div className={cx("floating-field")}>
                  <input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>Title</label>
                </div>

                <div className={cx("floating-field")}>
                  <input
                    value={formData.expertCategory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expertCategory: e.target.value,
                      })
                    }
                    placeholder=" "
                  />
                  <label>Expert Category</label>
                </div>
              </div>

              <div className={cx("meta-card")}>
                <div className={cx("floating-field")}>
                  <input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>Phone</label>
                </div>

                <div className={cx("floating-field")}>
                  <input
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({ ...formData, experience: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>Experience</label>
                </div>
              </div>

              <h2 className={cx("section-title")} style={{ marginTop: "28px" }}>🔗 Social & Web Links</h2>

              <div className={cx("meta-card")}>
                <div className={cx("floating-field")}>
                  <input
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>Website</label>
                </div>

                <div className={cx("floating-field")}>
                  <input
                    value={formData.linkedin}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedin: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>LinkedIn</label>
                </div>

                <div className={cx("floating-field")}>
                  <input
                    value={formData.twitter}
                    onChange={(e) =>
                      setFormData({ ...formData, twitter: e.target.value })
                    }
                    placeholder=" "
                  />
                  <label>Twitter</label>
                </div>
              </div>

              <h2 className={cx("section-title")} style={{ marginTop: "28px" }}>📝 Biography</h2>

              <div className={cx("meta-card", "full-row")}>
                <div className={cx("floating-field", "full-row")}>
                  <textarea
                    value={formData.shortBio}
                    onChange={(e) =>
                      setFormData({ ...formData, shortBio: e.target.value })
                    }
                    placeholder=" "
                    style={{ minHeight: "80px" }}
                  />
                  <label>Short Bio</label>
                  <small style={{ marginTop: "6px", color: "#6b7280" }}>
                    Brief introduction visible on author cards
                  </small>
                </div>
              </div>

              <div className={cx("meta-card", "full-row")}>
                <div className={cx("floating-field", "full-row")}>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder=" "
                    style={{ minHeight: "120px" }}
                  />
                  <label>Full Biography</label>
                  <small style={{ marginTop: "6px", color: "#6b7280" }}>
                    Complete biography shown on author profile page
                  </small>
                </div>
              </div>

              <h2 className={cx("section-title")} style={{ marginTop: "28px" }}>🎯 Expertise & Skills</h2>

              <div className={cx("meta-card")}>
                <div className={cx("floating-field", "full-row")}>
                  <textarea
                    value={formData.expertiseAreas?.join(", ") || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expertiseAreas: e.target.value
                          .split(",")
                          .map((area) => area.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder=" "
                    style={{ minHeight: "80px" }}
                  />
                  <label>Expertise Areas (comma-separated)</label>
                  <small style={{ marginTop: "6px", color: "#6b7280" }}>
                    Separate multiple areas with commas
                  </small>
                </div>

                <div className={cx("floating-field", "full-row")}>
                  <textarea
                    value={formData.specializations?.join(", ") || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specializations: e.target.value
                          .split(",")
                          .map((spec) => spec.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder=" "
                    style={{ minHeight: "80px" }}
                  />
                  <label>Specializations (comma-separated)</label>
                  <small style={{ marginTop: "6px", color: "#6b7280" }}>
                    Separate multiple specializations with commas
                  </small>
                </div>
              </div>
            </section>

            <div className={cx("action-bar")}>
              <button type="submit" disabled={loading}>
                {loading ? "Saving..." : editingId ? "Update Author" : "Create Author"}
              </button>
            </div>
          </form>
        )}

        {activeView === "list" && (
          <Box sx={{ mt: 0 }}>
            <CustomizedTable
              data={rows}
              columns={columns}
              total={rows.length}
              fetchData={fetchAdminAuthors}
            />
          </Box>
        )}

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Author</DialogTitle>

          <DialogContent>
            Are you sure you want to delete <strong>{selectedRow?.displayName}</strong>?
            <br />
            <small style={{ color: "#666", marginTop: "10px", display: "block" }}>
              This will only delete the author record. Existing blog assignments will not be affected.
            </small>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>

            <Button
              color="error"
              variant="contained"
              onClick={async () => {
                await dispatch(deleteAuthor(selectedRow.id));
                setDeleteDialogOpen(false);
                fetchAdminAuthors();
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Author Details Drawer */}
        <Drawer
          anchor="right"
          open={Boolean(detailDrawer)}
          onClose={() => setDetailDrawer(null)}
          PaperProps={{ sx: { width: 480, p: 0 } }}
        >
          {detailDrawer && (() => {
            const author = detailDrawer;
            const SLabel = ({ children }) => (
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  mb: 0.5,
                }}
              >
                {children}
              </Typography>
            );
            const DRow = ({ label, value }) => {
              if (!value || value === "-") return null;
              return (
                <Box sx={{ mb: 2 }}>
                  <SLabel>{label}</SLabel>
                  <Typography sx={{ fontSize: "0.9rem", color: "#1f2937", lineHeight: 1.6 }}>
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </Typography>
                </Box>
              );
            };

            return (
              <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
                {/* Header */}
                <Box
                  sx={{
                    p: 3,
                    background: "linear-gradient(135deg, #ff6b00, #ffad5e)",
                    color: "white",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {author.displayName}
                  </Typography>
                  <Typography sx={{ fontSize: "0.9rem", opacity: 0.95 }}>
                    {author.expertCategory || "Author"}
                  </Typography>
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
                  <DRow label="Email" value={author.email} />
                  <DRow label="Phone" value={author.phone} />
                  <DRow label="Title" value={author.title} />
                  <DRow label="Experience" value={author.experience} />

                  {author.website && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>Website</SLabel>
                      <Typography
                        component="a"
                        href={author.website.startsWith("http") ? author.website : `https://${author.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: "0.9rem",
                          color: "#ff6b00",
                          textDecoration: "none",
                          fontWeight: 600,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {author.website}
                      </Typography>
                    </Box>
                  )}

                  {author.linkedin && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>LinkedIn</SLabel>
                      <Typography
                        component="a"
                        href={author.linkedin.startsWith("http") ? author.linkedin : `https://${author.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: "0.9rem",
                          color: "#ff6b00",
                          textDecoration: "none",
                          fontWeight: 600,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {author.linkedin}
                      </Typography>
                    </Box>
                  )}

                  {author.twitter && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>Twitter</SLabel>
                      <Typography
                        component="a"
                        href={author.twitter.startsWith("http") ? author.twitter : `https://twitter.com/${author.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: "0.9rem",
                          color: "#ff6b00",
                          textDecoration: "none",
                          fontWeight: 600,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        {author.twitter}
                      </Typography>
                    </Box>
                  )}

                  {author.shortBio && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Box sx={{ mb: 2 }}>
                        <SLabel>Short Bio</SLabel>
                        <Typography sx={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.6 }}>
                          {author.shortBio}
                        </Typography>
                      </Box>
                    </>
                  )}

                  {author.bio && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>Full Biography</SLabel>
                      <Typography sx={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.6 }}>
                        {author.bio}
                      </Typography>
                    </Box>
                  )}

                  {author.expertiseAreas?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>Expertise Areas</SLabel>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {author.expertiseAreas.map((area, idx) => (
                          <Chip
                            key={idx}
                            label={area}
                            size="small"
                            sx={{
                              background: "linear-gradient(135deg, #ffe8cc, #ffd9a8)",
                              color: "#ff6b00",
                              fontWeight: 600,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {author.specializations?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>Specializations</SLabel>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {author.specializations.map((spec, idx) => (
                          <Chip
                            key={idx}
                            label={spec}
                            size="small"
                            sx={{
                              background: "linear-gradient(135deg, #e0f2fe, #bae6fd)",
                              color: "#0369a1",
                              fontWeight: 600,
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {author.blogCount !== undefined && (
                    <Box sx={{ mb: 2 }}>
                      <SLabel>Articles Published</SLabel>
                      <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: "#ff6b00" }}>
                        {author.blogCount || 0}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Footer Actions */}
                <Box
                  sx={{
                    p: 2,
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    gap: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => {
                      handleEdit(author._id);
                      setDetailDrawer(null);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="contained" fullWidth onClick={() => setDetailDrawer(null)}>
                    Close
                  </Button>
                </Box>
              </Box>
            );
          })()}
        </Drawer>
      </div>
    </div>
  );
}
