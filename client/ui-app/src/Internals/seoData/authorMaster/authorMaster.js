import React, { useEffect, useMemo, useState } from "react";
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
  TextField,
  Chip,
  IconButton,
} from "@mui/material";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import CustomizedTable from "../../../components/Table/CustomizedTable.js";
import styles from "./authorMaster.module.css";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import AdminViewTabs from "../../../components/AdminViewTabs.js";

const cx = createScopedClassNames(styles);

const defaultForm = {
  displayName: "",
  email: "",
  website: "",
  linkedin: "",
  bio: "",
  experience: "",
  expertCategory: "",
};

export default function AuthorMaster() {
  const dispatch = useDispatch();
  const { list = [], loading = false } = useSelector(
    (state) => state.authorMasterReducer || {}
  );

  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    dispatch(fetchAllAuthors());
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
      dispatch(fetchAllAuthors());
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
      bio: found.bio || "",
      experience: found.experience || "",
      expertCategory: found.expertCategory || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
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
          <EditOutlined
            onClick={() => handleEdit(row.id)}
            style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }}
          />
          <DeleteOutlined
            onClick={() => {
              setSelectedRow(row);
              setDeleteDialogOpen(true);
            }}
            style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }}
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
              <h2 className={cx("section-title")}>Author Details</h2>

              <div className={cx("form-row")}>
                <div className={cx("form-group")}>
                  <TextField
                    label="Author Name *"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayName: e.target.value,
                      })
                    }
                    fullWidth
                    placeholder="e.g., Alagudurai"
                    required
                  />
                </div>

                <div className={cx("form-group")}>
                  <TextField
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    fullWidth
                    placeholder="author@example.com"
                  />
                </div>
              </div>

              <div className={cx("form-row")}>
                <div className={cx("form-group")}>
                  <TextField
                    label="Website"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    fullWidth
                    placeholder="https://example.com"
                  />
                </div>

                <div className={cx("form-group")}>
                  <TextField
                    label="LinkedIn"
                    value={formData.linkedin}
                    onChange={(e) =>
                      setFormData({ ...formData, linkedin: e.target.value })
                    }
                    fullWidth
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              <div className={cx("form-row")}>
                <div className={cx("form-group")}>
                  <TextField
                    label="Expert Category"
                    value={formData.expertCategory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expertCategory: e.target.value,
                      })
                    }
                    fullWidth
                    placeholder="e.g., SEO Specialist"
                  />
                </div>

                <div className={cx("form-group")}>
                  <TextField
                    label="Experience"
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({ ...formData, experience: e.target.value })
                    }
                    fullWidth
                    placeholder="e.g., 10+ years"
                  />
                </div>
              </div>

              <div className={cx("form-row", "full-width")}>
                <TextField
                  label="Biography"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Write a brief bio about the author..."
                />
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
              fetchData={() => dispatch(fetchAllAuthors())}
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
                dispatch(fetchAllAuthors());
              }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
}
