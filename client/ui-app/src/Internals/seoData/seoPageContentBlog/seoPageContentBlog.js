import { createScopedClassNames } from "../../../utils/createScopedClassNames";
// FILE: SeoPageContentBlogs.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SeoPageContentForm from "./pageContentBlogForm";
import { viewAllSeoPageContentBlogs, createSeoPageContentBlogs, updateSeoPageContentBlogs, deleteSeoPageContentBlogs } from "../../../redux/actions/seoPageContentBlogAction";
import { getAllLocation, createLocation } from "../../../redux/actions/locationAction.js";
import { Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Chip } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CustomizedTable from "../../../components/Table/CustomizedTable";
import styles from "./seoPageContentBlog.module.css";
import AdminViewTabs from "../../../components/AdminViewTabs.js";
const cx = createScopedClassNames(styles);
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
  ogImage: "",
  experience: "",
  expertCategory: "",
  email: "",
  website: "",
  linkedin: "",
  bestFor: [],
  features: [],
  contentBlocks: []
};
export default function SeoPageContentBlogs() {
  const dispatch = useDispatch();
  const {
    list = [],
    total = 0,
    loading = false
  } = useSelector(state => state.seoPageContentBlogReducer) || {};
  const {
    location = []
  } = useSelector(state => state.locationReducer || {});
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const modules = useMemo(() => ({
    toolbar: [[{
      header: [1, 2, 3, false]
    }], ["bold", "italic", "underline", "strike"], [{
      list: "ordered"
    }, {
      list: "bullet"
    }], ["link"], ["clean"]]
  }), []);
  const formats = useMemo(() => ["header", "bold", "italic", "underline", "strike", "list", "bullet", "link"], []);
  useEffect(() => {
    dispatch(viewAllSeoPageContentBlogs());
    dispatch(getAllLocation({
      pageNo: 1,
      pageSize: 1000
    }));
  }, [dispatch]);
  const resetForm = () => {
    setFormData(defaultForm);
    setEditingId(null);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const locationExists = location.some(loc => loc.city?.toLowerCase() === formData.location?.toLowerCase() || loc.district?.toLowerCase() === formData.location?.toLowerCase());
    if (!locationExists && formData.location) {
      await dispatch(createLocation({
        city: formData.location,
        district: formData.location,
        state: "N/A",
        country: "N/A"
      }));
    }

    // Ensure pageImages is always sent and not lost
    const submitData = {
      ...formData,
      pageImages: formData.pageImages || []
    };
    const action = editingId ? updateSeoPageContentBlogs(editingId, submitData) : createSeoPageContentBlogs(submitData);
    await dispatch(action);
    resetForm();
    dispatch(viewAllSeoPageContentBlogs());
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const handleEdit = rowId => {
    const found = list.find(x => x._id === rowId);
    if (!found) return;
    setEditingId(rowId);
    setActiveView("form");
    setFormData({
      ...defaultForm,
      ...found,
      pageImages: found.pageImages || [],
      profileImage: found.profileImage || "",
      ogImage: found.ogImage || "",
      popularBusiness: found.businessDetails || [],
      tags: found.tags || [],
      faq: found.faq || [],
      contentBlocks: found.contentBlocks || []
    });
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const rows = list.map(seo => ({
    id: seo._id,
    pageType: seo.pageType,
    category: seo.category,
    location: seo.location,
    views: seo.views || 0,
    status: seo.isActive ? "Active" : "Inactive"
  }));
  const columns = [{
    id: "pageType",
    label: "Page Type"
  }, {
    id: "category",
    label: "Category"
  }, {
    id: "location",
    label: "Location"
  }, {
    id: "views",
    label: "Views"
  }, {
    id: "status",
    label: "Status",
    renderCell: (_, row) => <Chip size="small" label={row.status} color={row.status === "Active" ? "success" : "default"} />
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <EditOutlined onClick={() => handleEdit(row.id)} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        <DeleteOutlined onClick={() => { setSelectedRow(row); setDeleteDialogOpen(true); }} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
      </Box>
    )
  }];
  return <div className={cx("seo-shell")}>
      <div className={cx("seo-container")}>
        <header className={cx("seo-header")}>
          <div>
            <h1>
              {editingId ? "Edit SEO Blog Content" : "Create SEO Blog Content"}
            </h1>
            <p>Premium SEO content management dashboard</p>
          </div>

          <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={resetForm}>
            Reset
          </Button>
        </header>

        <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="Blog Content" listLabel="Blog List" listCount={rows.length} />

        {activeView === "form" && (
        <SeoPageContentForm formData={formData} setFormData={setFormData} handleSubmit={handleSubmit} loading={loading} editingId={editingId} modules={modules} formats={formats} />
        )}

        {activeView === "list" && (
        <Box sx={{
        mt: 0
      }}>
          <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(viewAllSeoPageContentBlogs({
          pageNo,
          pageSize,
          options
        }))} />
        </Box>
        )}

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Blog</DialogTitle>

          <DialogContent>
            Are you sure you want to delete this blog content?
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>

            <Button color="error" variant="contained" onClick={async () => {
            await dispatch(deleteSeoPageContentBlogs(selectedRow.id));
            setDeleteDialogOpen(false);
            dispatch(viewAllSeoPageContentBlogs());
          }}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>;
}
