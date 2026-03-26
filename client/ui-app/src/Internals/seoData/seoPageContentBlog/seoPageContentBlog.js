import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import SeoPageContentForm from "./pageContentBlogForm.js";

import {
    viewAllSeoPageContentBlogs,
    createSeoPageContentBlogs,
    updateSeoPageContentBlogs,
    deleteSeoPageContentBlogs,
} from "../../../redux/actions/seoPageContentBlogAction.js";

import {
    Box,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import CustomizedTable from "../../../components/Table/CustomizedTable.js";
import "./seoPageContentBlog.css";

export default function SeoPageContentBlogs() {
    const dispatch = useDispatch();

    const { list = [], total = 0, loading = false } =
        useSelector((state) => state.seoPageContentBlogReducer) || {};

    const [formData, setFormData] = useState({
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
        pageType: "",
        category: "",
        location: "",
        heading: "",
        headerContent: "",
        pageContent: "",
        pageImages: [],
        popularBusiness: [],
        profileImage: "",

    });

    const [editingId, setEditingId] = useState(null);
    const [errors, setErrors] = useState({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    const modules = {
        toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link"],
        ],
    };

    const formats = [
        "header",
        "bold",
        "italic",
        "underline",
        "list",
        "bullet",
        "link",
    ];

    useEffect(() => {
        dispatch(viewAllSeoPageContentBlogs());
    }, [dispatch]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const action = editingId
            ? updateSeoPageContentBlogs(editingId, formData)
            : createSeoPageContentBlogs(formData);

        dispatch(action).then(() => {
            setFormData({
                metaTitle: "",
                metaDescription: "",
                metaKeywords: "",
                pageType: "",
                category: "",
                location: "",
                heading: "",
                headerContent: "",
                pageContent: "",
                profileImage: "",
                pageImages: [],
                popularBusiness: [] 
            });
            setEditingId(null);
            dispatch(viewAllSeoPageContentBlogs());
        });
    };

    const rows = list.map((seo) => ({
        id: seo._id,
        pageType: seo.pageType,
        category: seo.category,
        location: seo.location,
    }));

    const columns = [
        { id: "pageType", label: "Page Type" },
        { id: "category", label: "Category" },
        { id: "location", label: "Location" },
        {
            id: "action",
            label: "Action",
            renderCell: (_, row) => (
                <>
                    <IconButton
                        onClick={() => {
                            setEditingId(row.id);
                            const found = list.find((x) => x._id === row.id);

                            setFormData({
                                ...found,
                                pageImages: found.pageImages || [],
                                popularBusiness: found.businessDetails || [],

                            });

                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                    >
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
                </>
            ),
        },
    ];

    return (
        <div className="seo-shell">
            <div className="seo-container">
                <header className="seo-header">
                    <h1>
                        {editingId ? "Edit SEO Page Content" : "Create SEO Page Content"}
                    </h1>
                    <p>Premium SEO content management</p>
                </header>

                <SeoPageContentForm
                    formData={formData}
                    setFormData={setFormData}
                    handleSubmit={handleSubmit}
                    loading={loading}
                    editingId={editingId}
                    errors={errors}
                    modules={modules}
                    formats={formats}
                />

                <Box sx={{ mt: 6 }}>
                    <CustomizedTable
                        data={rows}
                        columns={columns}
                        total={total}
                        fetchData={(pageNo, pageSize, options) =>
                            dispatch(viewAllSeoPageContentBlogs({ pageNo, pageSize, options }))
                        }
                    />
                </Box>

                <Dialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                >
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        Are you sure you want to delete this content?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            color="error"
                            variant="contained"
                            onClick={() =>
                                dispatch(deleteSeoPageContentBlogs(selectedRow.id)).then(() => {
                                    setDeleteDialogOpen(false);
                                    dispatch(viewAllSeoPageContentBlogs());
                                })
                            }
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>
    );
}