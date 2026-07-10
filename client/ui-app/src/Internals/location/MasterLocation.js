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

  // Filters
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterPincode, setFilterPincode] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [tableKey, setTableKey] = useState(0); // Reset pagination when filters change

  useEffect(() => {
    // Load all locations on first load (large pageSize to avoid pagination issues with filters)
    dispatch(getAllMasterLocation({ pageNo: 1, pageSize: 10000 }));
  }, [dispatch]);

  // Reset pagination when filters change
  useEffect(() => {
    setTableKey(prev => prev + 1);
  }, [filterDistrict, filterLevel, filterPincode, filterStatus]);

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

  // Get unique districts and levels for filter dropdowns
  const uniqueDistricts = [...new Set(masterLocation.map(loc => loc.district))].sort();
  const uniqueLevels = ["district", "zone", "ward", "locality"];

  // Apply filters
  const filteredLocation = masterLocation.filter(loc => {
    if (filterStatus === "active" && !loc.isActive) return false;
    if (filterStatus === "inactive" && loc.isActive) return false;
    if (filterDistrict && loc.district !== filterDistrict) return false;
    if (filterLevel && loc.level !== filterLevel) return false;
    if (filterPincode && !((loc.pincode && loc.pincode.includes(filterPincode)) || (loc.pincodes && loc.pincodes.join(",").includes(filterPincode)))) return false;
    return true;
  });

  const rows = filteredLocation.map((loc, index) => ({
    id: loc._id || index,
    name: loc.locality || loc.ward || loc.zone || loc.district,
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
    id: "name",
    label: "Name",
    renderCell: (value, row) => <strong>{value}</strong>
  }, {
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

          {/* Filters */}
          <Box sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
            padding: "16px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px"
          }}>
            <Box>
              <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                District
              </label>
              <select
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="">All Districts</option>
                {uniqueDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Box>

            <Box>
              <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                Level
              </label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="">All Levels</option>
                {uniqueLevels.map(l => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </Box>

            <Box>
              <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                Pincode
              </label>
              <input
                type="text"
                placeholder="Search pincode..."
                value={filterPincode}
                onChange={(e) => setFilterPincode(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem"
                }}
              />
            </Box>

            <Box>
              <label style={{ fontSize: "0.875rem", fontWeight: "600", color: "#6b7280", display: "block", marginBottom: "6px" }}>
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  backgroundColor: "#ffffff"
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </select>
            </Box>

            <Box sx={{ display: "flex", alignItems: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilterDistrict("");
                  setFilterLevel("");
                  setFilterPincode("");
                  setFilterStatus("active");
                }}
                fullWidth
              >
                Clear Filters
              </Button>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ marginBottom: "12px", color: "#6b7280" }}>
            Showing {rows.length} of {masterLocation.length} locations
          </Typography>

          <Box sx={{ width: "100%" }}>
              <CustomizedTable
                key={tableKey}
                data={rows}
                columns={columns}
                total={Math.max(rows.length, 1)}
                fetchData={(pageNo, pageSize, options) => {
                  // Pass filters along with pagination
                  const mergedOptions = {
                    ...options,
                    search: options.search || "",
                    status: filterStatus,
                    level: filterLevel,
                    district: filterDistrict
                  };
                  dispatch(getAllMasterLocation({
                    pageNo,
                    pageSize: 10000,
                    options: mergedOptions
                  }));
                }}
              />
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
