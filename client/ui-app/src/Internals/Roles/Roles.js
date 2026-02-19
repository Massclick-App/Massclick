import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    getAllRoles,
    createRoles,
    editRoles,
    deleteRoles,
} from "../../redux/actions/rolesAction";
import {
    Box,
    Button,
    Typography,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import './roles.css'
import CustomizedTable from "../../components/Table/CustomizedTable";

export default function Roles() {
    const dispatch = useDispatch();
    const { roles = [], total = 0, loading, error } = useSelector(
        (state) => state.rolesReducer || {}
    );

    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        roleName: "",
        permissions: "",
        description: "",
        createdBy: "",
    });

    const [editingId, setEditingId] = useState(null);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    useEffect(() => {
        dispatch(getAllRoles());
    }, [dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const validateForm = () => {
        let newErrors = {};
        if (!formData.roleName.trim()) newErrors.roleName = "Role Name is required";
        if (!formData.permissions.trim()) newErrors.permissions = "Permissions are required";
        if (!formData.description.trim()) newErrors.description = "Description is required";
        if (!formData.createdBy.trim()) newErrors.createdBy = "Created By is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const resetForm = () => {
        setFormData({
            roleName: "",
            permissions: "",
            description: "",
            createdBy: "",
        });
        setEditingId(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (editingId) {
            dispatch(editRoles(editingId, formData))
                .then(() => {
                    resetForm();
                    dispatch(getAllRoles());
                })
                .catch((err) => console.error("Update roles failed:", err));
        } else {
            dispatch(createRoles(formData))
                .then(() => {
                    resetForm();
                    dispatch(getAllRoles());
                })
                .catch((err) => console.error("Create roles failed:", err));
        }
    };

    const handleEdit = (row) => {
        setEditingId(row.id);
        setFormData({
            roleName: row.roleName || "",
            permissions: row.permissions || "",
            description: row.description || "",
            createdBy: row.createdBy || "",
        });
    };

    const handleDeleteClick = (row) => {
        setSelectedRow(row);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        debugger
        if (selectedRow?.id) {
            dispatch(deleteRoles(selectedRow.id))
                .then(() => {
                    dispatch(getAllRoles());
                    setDeleteDialogOpen(false);
                    setSelectedRow(null);
                })
                .catch((err) => console.error("Delete roles failed:", err));
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setSelectedRow(null);
    };

    const rows = roles
        .filter((rol) => rol.isActive)

        .map((rol, index) => ({
            id: rol._id || index,
            roleName: rol.roleName,
            permissions: rol.permissions,
            description: rol.description,
            createdBy: rol.createdBy,
            isActive: rol.isActive,

        }));

    const rolesList = [
        { id: "roleName", label: "Role Name" },
        { id: "permissions", label: "Permissions" },
        { id: "description", label: "Description" },
        { id: "createdBy", label: "Created By" },
        {
            id: "action",
            label: "Action",
            renderCell: (_, row) => (
                <div style={{ display: "flex", gap: "8px" }}>
                    <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
                        <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton color="error" size="small" onClick={() => handleDeleteClick(row)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                </div>
            ),
        },
    ];


    const fields = [
        { label: "RoleName", name: "roleName", required: true, type: "text" },
        { label: "Permissions", name: "permissions", required: true, type: "text" },
        { label: "Descriptions", name: "description", required: true, type: "text" },
        { label: "CreatedBy", name: "createdBy", required: true, type: "text" },
    ];

    return (
        <div className="role-page">
            <div className="role-card form-section">
                <h2 className="role-card-title">{editingId ? "Edit Roles" : "Add New Roles"}</h2>
                <form onSubmit={handleSubmit} className="role-form-grid">
                    {fields.map((field, i) => (
                        <div key={i} className="role-form-input-group">
                            <label htmlFor={field.name} className="role-input-label">{field.label}</label>
                            <input
                                type={field.type}
                                id={field.name}
                                name={field.name}
                                value={formData[field.name]}
                                onChange={handleChange}
                                className={`role-text-input ${errors[field.name] ? "error" : ""}`}
                            />
                            {errors[field.name] && (
                                <p className="role-error-text">{errors[field.name]}</p>
                            )}
                        </div>
                    ))}

                    <div className="role-button-group col-span-all">
                        <button type="submit" className="role-submit-button" disabled={loading}>
                            {loading ? "Loading..." : editingId ? "Update Roles" : "Create Roles"}
                        </button>
                        {editingId && (
                            <button type="button" className="role-cancel-button" onClick={resetForm}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
                {error && <p className="role-error-text" style={{ marginTop: "16px" }}>
                    {(() => {
                        if (typeof error === "string") return error;
                        if (error instanceof Error) return error.message;
                        if (typeof error === "object") return JSON.stringify(error, null, 2);
                        return String(error);
                    })()}
                </p>}
            </div>

            <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
                Roles Table
            </Typography>
            <Box sx={{ width: "100%" }}>
                <CustomizedTable
                    data={rows}
                    columns={rolesList}
                    total={total}
                    fetchData={(pageNo, pageSize, options) =>
                        dispatch(getAllRoles({ pageNo, pageSize, options }))
                    }
                />

            </Box>

            {/* 🔹 Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete <strong>{selectedRow?.roleName || "this role"}</strong>?
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelDelete} color="secondary">Cancel</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </div>

    );
}
