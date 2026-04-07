import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    getAllLocation,
    createLocation,
    editLocation,
    deleteLocation,
} from "../../redux/actions/locationAction.js";
import './location.css'
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CustomizedTable from "../../components/Table/CustomizedTable.js";

export default function Location() {
    const dispatch = useDispatch();
    const { location = [], total = 0, loading, error } = useSelector(
        (state) => state.locationReducer || {}
    );
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        country: "",
        state: "",
        district: "",
        city: "",
        pincode: "",
        addressLine1: "",
        addressLine2: "",
    });

    const [editingId, setEditingId] = useState(null);

    // 🔹 State for delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    useEffect(() => {
        dispatch(getAllLocation());
    }, [dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const validateForm = () => {
        let newErrors = {};

        if (!formData.country.trim()) newErrors.country = "Country is required";
        if (!formData.state.trim()) newErrors.state = "State is required";
        if (!formData.district.trim()) newErrors.district = "District is required";
        if (!formData.city.trim()) newErrors.city = "City is required";

        if (!formData.pincode.trim()) {
            newErrors.pincode = "Pincode is required";
        } else if (!/^\d{5,6}$/.test(formData.pincode)) {
            newErrors.pincode = "Invalid pincode format";
        }

        if (!formData.addressLine1.trim()) {
            newErrors.addressLine1 = "Address Line 1 is required";
        }


        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const resetForm = () => {
        setFormData({
            country: "",
            state: "",
            district: "",
            city: "",
            pincode: "",
            addressLine1: "",
            addressLine2: "",
        });
        setEditingId(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (editingId) {
            dispatch(editLocation(editingId, formData))
                .then(() => {
                    resetForm();
                    dispatch(getAllLocation());
                })
                .catch((err) => console.error("Update location failed:", err));
        } else {
            dispatch(createLocation(formData))
                .then(() => {
                    resetForm();
                    dispatch(getAllLocation());
                })
                .catch((err) => console.error("Create location failed:", err));
        }
    };

    const handleEdit = (row) => {
        setEditingId(row.id);
        setFormData({
            country: row.country || "",
            state: row.state || "",
            district: row.district || "",
            city: row.city || "",
            pincode: row.pincode || "",
            addressLine1: row.addressLine1 || "",
            addressLine2: row.addressLine2 || "",
        });
    };

    const handleDeleteClick = (row) => {
        setSelectedRow(row);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        debugger
        if (selectedRow?.id) {
            dispatch(deleteLocation(selectedRow.id))
                .then(() => {
                    dispatch(getAllLocation());
                    setDeleteDialogOpen(false);
                    setSelectedRow(null);
                })
                .catch((err) => console.error("Delete location failed:", err));
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setSelectedRow(null);
    };

    const rows = location
        .filter((loc) => loc.isActive)

        .map((loc, index) => ({
            id: loc._id || index,
            country: loc.country,
            state: loc.state,
            district: loc.district,
            city: loc.city,
            pincode: loc.pincode || "-",
            addressLine1: loc.addressLine1 || "-",
            addressLine2: loc.addressLine2 || "-",
            isActive: loc.isActive,

        }));

    const locationList = [
        { id: "country", label: "Country" },
        { id: "state", label: "State" },
        { id: "district", label: "District" },
        { id: "city", label: "City" },
        { id: "pincode", label: "Pincode" },
        { id: "addressLine1", label: "Address Line 1" },
        { id: "addressLine2", label: "Address Line 2" },
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
        { label: "Country", name: "country", required: true, type: "text" },
        { label: "State", name: "state", required: true, type: "text" },
        { label: "District", name: "district", required: true, type: "text" },
        { label: "City", name: "city", required: true, type: "text" },
        { label: "PinCode", name: "pincode", required: true, type: "text" },
        { label: "AddressLine1", name: "addressLine1", required: true, type: "text" },
        { label: "AddressLine2", name: "addressLine2", required: true, type: "text" },
    ];

    return (

        <div className="location-page">
            <div className="location-card location-form-section">
                <h2 className="location-card-title">
                    {editingId ? "Edit Location" : "Add New Location"}
                </h2>

                <form onSubmit={handleSubmit} className="location-form-grid">
                    {fields.map(({ label, name }) => (
                        <div key={name} className="location-form-input-group">
                            <label htmlFor={name} className="location-input-label">
                                {label}
                            </label>
                            <input
                                type="text"
                                id={name}
                                name={name}
                                className={`location-text-input ${errors[name] ? "error" : ""
                                    }`}
                                value={formData[name]}
                                onChange={handleChange}
                            />
                            {errors[name] && (
                                <p className="location-error-text">{errors[name]}</p>
                            )}
                        </div>
                    ))}

                    <div className="location-form-input-group location-col-span-all location-upload-section">
                        <div className="location-upload-content">
                            <button
                                type="submit"
                                className="location-submit-button"
                                disabled={loading}
                            >
                                {loading ? (
                                    <CircularProgress size={24} color="inherit" />
                                ) : editingId ? (
                                    "Update Location"
                                ) : (
                                    "Create Location"
                                )}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="location-upload-button"
                                    onClick={resetForm}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </form>

                {error && (
                    <p className="location-error-text" style={{ marginTop: "16px" }}>
                        {(() => {
                            if (typeof error === "string") return error;
                            if (error instanceof Error) return error.message;
                            if (typeof error === "object") return JSON.stringify(error, null, 2);
                            return String(error);
                        })()}
                    </p>
                )}

                <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
                    Location Table
                </Typography>

                <Box sx={{ width: "100%" }}>
                    <CustomizedTable
                        data={rows}
                        columns={locationList}
                        total={total}
                        fetchData={(pageNo, pageSize, options) =>
                            dispatch(getAllLocation({ pageNo, pageSize, options }))
                        }
                    />
                </Box>

                <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        Are you sure you want to delete{" "}
                        <strong>{selectedRow?.city || "this location"}</strong>?
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={cancelDelete} color="secondary">
                            Cancel
                        </Button>
                        <Button onClick={confirmDelete} color="error" variant="contained">
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>
    );
}
