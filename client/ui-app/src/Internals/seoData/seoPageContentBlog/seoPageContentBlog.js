// FILE: SeoPageContentBlogs.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SeoPageContentForm from "./pageContentBlogForm";

import {
  viewAllSeoPageContentBlogs,
  createSeoPageContentBlogs,
  updateSeoPageContentBlogs,
  deleteSeoPageContentBlogs,
} from "../../../redux/actions/seoPageContentBlogAction";

import {
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import CustomizedTable from "../../../components/Table/CustomizedTable";
import "./seoPageContentBlog.css";

const defaultForm = {
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  pageType: "",
  category: "",
  location: "",
  heading: "",
  excerpt: "",
  headerContent: "",
  pageContent: "",
  tags: [],
  faq: [],
  pageImages: [],
  popularBusiness: [],
  profileImage: "",
};

export default function SeoPageContentBlogs() {
  const dispatch = useDispatch();

  const { list = [], total = 0, loading = false } =
    useSelector((state) => state.seoPageContentBlogReducer) || {};

  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = useMemo(
    () => [
      "header",
      "bold",
      "italic",
      "underline",
      "strike",
      "list",
      "bullet",
      "link",
    ],
    []
  );

  useEffect(() => {
    dispatch(viewAllSeoPageContentBlogs());
  }, [dispatch]);

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const action = editingId
      ? updateSeoPageContentBlogs(editingId, formData)
      : createSeoPageContentBlogs(formData);

    await dispatch(action);
    resetForm();
    dispatch(viewAllSeoPageContentBlogs());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEdit = (rowId) => {
    const found = list.find((x) => x._id === rowId);
    if (!found) return;

    setEditingId(rowId);

    setFormData({
      ...defaultForm,
      ...found,
      pageImages: found.pageImages || [],
      profileImage: found.profileImage || "",
      popularBusiness: found.businessDetails || [],
      tags: found.tags || [],
      faq: found.faq || [],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const rows = list.map((seo) => ({
    id: seo._id,
    pageType: seo.pageType,
    category: seo.category,
    location: seo.location,
    views: seo.views || 0,
    status: seo.isActive ? "Active" : "Inactive",
  }));

  const columns = [
    { id: "pageType", label: "Page Type" },
    { id: "category", label: "Category" },
    { id: "location", label: "Location" },
    { id: "views", label: "Views" },
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
        <div className="table-actions">
          <IconButton onClick={() => handleEdit(row.id)}>
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => {
              setSelectedRow(row);
              setDeleteDialogOpen(true);
            }}
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="seo-shell">
      <div className="seo-container">
        <header className="seo-header">
          <div>
            <h1>
              {editingId
                ? "Edit SEO Blog Content"
                : "Create SEO Blog Content"}
            </h1>
            <p>Premium SEO content management dashboard</p>
          </div>

          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            onClick={resetForm}
          >
            Reset
          </Button>
        </header>

        <SeoPageContentForm
          formData={formData}
          setFormData={setFormData}
          handleSubmit={handleSubmit}
          loading={loading}
          editingId={editingId}
          modules={modules}
          formats={formats}
        />

        <Box sx={{ mt: 5 }}>
          <CustomizedTable
            data={rows}
            columns={columns}
            total={total}
            fetchData={(pageNo, pageSize, options) =>
              dispatch(
                viewAllSeoPageContentBlogs({
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
          <DialogTitle>Delete Blog</DialogTitle>

          <DialogContent>
            Are you sure you want to delete this blog content?
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>

            <Button
              color="error"
              variant="contained"
              onClick={async () => {
                await dispatch(
                  deleteSeoPageContentBlogs(selectedRow.id)
                );
                setDeleteDialogOpen(false);
                dispatch(viewAllSeoPageContentBlogs());
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