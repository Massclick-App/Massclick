import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllMasterLocation, createMasterLocation, editMasterLocation, deleteMasterLocation } from "../../redux/actions/masterLocationAction.js";
import styles from "./masterLocation.module.css";
import { Box, Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import AdminViewTabs from "../../components/AdminViewTabs.js";

const cx = createScopedClassNames(styles);

const LEVEL_COLORS = {
  district: "error",
  zone: "warning",
  ward: "info",
  locality: "success"
};

export default function MasterLocation() {
  const dispatch = useDispatch();
  const {
    masterLocation = [],
    total = 0,
    loading,
    error
  } = useSelector(state => state.masterLocationReducer || {});
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    state: "Tamil Nadu",
    district: "Tiruchirappalli",
    zone: "",
    ward: "",
    locality: "",
    pincode: "",
    alternateNames: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [activeView, setActiveView] = useState("list");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    dispatch(getAllMasterLocation());
  }, [dispatch]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.state.trim()) newErrors.state = "State is required";
    if (!formData.district.trim()) newErrors.district = "District is required";
    if (!formData.zone.trim()) newErrors.zone = "Zone is required";
    if (formData.locality.trim() && !formData.ward.trim()) {
      newErrors.ward = "Ward is required when locality is given";
    }
    if (formData.pincode.trim() && !/^\d{6}$/.test(formData.pincode.trim())) {
      newErrors.pincode = "Pincode must be 6 digits";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      state: "Tamil Nadu",
      district: "Tiruchirappalli",
      zone: "",
      ward: "",
      locality: "",
      pincode: "",
      alternateNames: ""
    });
    setErrors({});
    setEditingId(null);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) return;
    if (editingId) {
      dispatch(editMasterLocation(editingId, formData)).then(() => {
        resetForm();
        setActiveView("list");
        dispatch(getAllMasterLocation());
      }).catch(() => {});
    } else {
      dispatch(createMasterLocation(formData)).then(() => {
        resetForm();
        dispatch(getAllMasterLocation());
      }).catch(() => {});
    }
  };

  const handleEdit = row => {
    setEditingId(row.id);
    setFormData({
      state: row.state || "Tamil Nadu",
      district: row.district || "Tiruchirappalli",
      zone: row.zone || "",
      ward: row.ward || "",
      locality: row.locality || "",
      pincode: row.pincode || "",
      alternateNames: Array.isArray(row.alternateNamesRaw) ? row.alternateNamesRaw.join(", ") : ""
    });
    setActiveView("form");
  };

  const handleDeleteClick = row => {
    setSelectedRow(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRow?.id) {
      dispatch(deleteMasterLocation(selectedRow.id)).then(() => {
        dispatch(getAllMasterLocation());
        setDeleteDialogOpen(false);
        setSelectedRow(null);
      }).catch(() => {});
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedRow(null);
  };

  const rows = masterLocation.filter(loc => loc.isActive).map((loc, index) => ({
    id: loc._id || index,
    state: loc.state,
    district: loc.district,
    zone: loc.zone || "-",
    ward: loc.ward || "-",
    locality: loc.locality || "-",
    level: loc.level,
    pincode: loc.pincode || (loc.pincodes?.length ? loc.pincodes.join(", ") : "-"),
    hierarchyPath: loc.hierarchyPath,
    slug: loc.slug,
    alternateNames: loc.alternateNames?.length ? loc.alternateNames.join(", ") : "-",
    alternateNamesRaw: loc.alternateNames || [],
    isActive: loc.isActive
  }));

  const columns = [{
    id: "zone",
    label: "Zone"
  }, {
    id: "ward",
    label: "Ward"
  }, {
    id: "locality",
    label: "Locality"
  }, {
    id: "level",
    label: "Level",
    renderCell: (value) => (
      <Chip label={value} size="small" color={LEVEL_COLORS[value] || "default"} variant="outlined" />
    )
  }, {
    id: "pincode",
    label: "Pincode"
  }, {
    id: "alternateNames",
    label: "Alternate Names"
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <EditOutlined onClick={() => handleEdit(row)} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        <DeleteOutlined onClick={() => handleDeleteClick(row)} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
      </Box>
    )
  }];

  const fields = [{
    label: "State",
    name: "state"
  }, {
    label: "District",
    name: "district"
  }, {
    label: "Zone (e.g. Srirangam, Manapparai)",
    name: "zone"
  }, {
    label: "Ward",
    name: "ward"
  }, {
    label: "Locality / Area",
    name: "locality"
  }, {
    label: "Pincode",
    name: "pincode"
  }, {
    label: "Alternate Names (comma separated)",
    name: "alternateNames"
  }];

  return <div className={cx("master-location-page")}>
      <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="Master Location" listLabel="Master Locations" listCount={rows.length} />

      {activeView === "form" && (
      <div className={cx("master-location-card master-location-form-section")}>
          <h2 className={cx("master-location-card-title")}>
              {editingId ? "Edit Master Location" : "Add New Master Location"}
          </h2>

          <p className={cx("master-location-hint")}>
              Fill the hierarchy top-down: Zone → Ward → Locality. Leave Ward/Locality empty to
              create a zone-level entry. Slug, keywords and level are generated automatically.
          </p>

          <form onSubmit={handleSubmit} className={cx("master-location-form-grid")}>
              {fields.map(({ label, name }) => <div key={name} className={cx("master-location-form-input-group")}>
                      <label htmlFor={name} className={cx("master-location-input-label")}>
                          {label}
                      </label>
                      <input
                        type="text"
                        id={name}
                        name={name}
                        className={`form-text-input ${errors[name] ? "error" : ""}`}
                        value={formData[name]}
                        onChange={handleChange}
                      />
                      {errors[name] && <p className="form-error-text">{errors[name]}</p>}
                    </div>)}

              <div className={cx("master-location-form-input-group master-location-col-span-all master-location-actions-section")}>
                  <div className={cx("master-location-actions-content")}>
                      <button type="submit" className={cx("master-location-submit-button")} disabled={loading}>
                          {loading ? <CircularProgress size={24} color="inherit" /> : editingId ? "Update Location" : "Create Location"}
                      </button>

                      {editingId && <button type="button" className={cx("master-location-cancel-button")} onClick={resetForm}>
                              Cancel
                          </button>}
                  </div>
              </div>
          </form>

          {error && <p className={cx("master-location-error-text")}>
                  {(() => {
                    if (typeof error === "string") return error;
                    if (error instanceof Error) return error.message;
                    if (typeof error === "object") return error.message || JSON.stringify(error, null, 2);
                    return String(error);
                  })()}
              </p>}
      </div>
      )}

      {activeView === "list" && (
      <div className={cx("master-location-card master-location-form-section")}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
              Master Location Table
          </Typography>

          <Box sx={{ width: "100%" }}>
              <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(getAllMasterLocation({
                pageNo,
                pageSize,
                options
              }))} />
          </Box>
      </div>
      )}

      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
              Are you sure you want to delete{" "}
              <strong>{selectedRow?.hierarchyPath || "this location"}</strong>?
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
  </div>;
}
