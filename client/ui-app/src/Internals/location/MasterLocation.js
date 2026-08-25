import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllMasterLocation, createMasterLocation, editMasterLocation, deleteMasterLocation, getMasterLocationFieldOptions, toggleMasterLocation, bulkToggleMasterLocation } from "../../redux/actions/masterLocationAction.js";
import styles from "./masterLocation.module.css";
import { Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Autocomplete, TextField, Switch, Tooltip, Checkbox, Alert, IconButton, Menu, MenuItem, ListItemIcon } from "@mui/material";
import { CheckCircle2, Eye, FilterX, ListChecks, MoreVertical, PauseCircle, Pencil, RotateCcw, SearchCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import AdminViewTabs from "../../components/AdminViewTabs.js";

const cx = createScopedClassNames(styles);

// Soft badge tones (tinted background + same-hue text) rather than MUI's
// outlined chips, so the table reads as one quiet system instead of a row of
// competing borders.
const Badge = ({ tone = "neutral", children }) => (
  <span className={cx(`master-location-badge master-location-badge-${tone}`)}>
    {children}
  </span>
);

const LEVEL_TONES = {
  district: "red",
  zone: "amber",
  ward: "blue",
  locality: "green"
};

const SOURCE_TONES = {
  Google: "amber",
  Imported: "blue",
  Manual: "neutral"
};

const TRICHY_DISTRICT = "Tiruchirappalli";
const REVIEW_QUEUE_FILTERS = {
  district: TRICHY_DISTRICT,
  zone: "",
  ward: "",
  locality: "",
  level: "locality",
  pincode: "",
  pincodeStatus: "all",
  status: "inactive",
  review: "pending",
  importSource: "all",
  origin: "all"
};

const WORK_MODES = [{
  id: "review",
  label: "Review",
  icon: ListChecks,
  filters: REVIEW_QUEUE_FILTERS
}, {
  id: "live",
  label: "Live Trichy",
  icon: Eye,
  filters: {
    ...REVIEW_QUEUE_FILTERS,
    status: "active",
    review: "approved"
  }
}, {
  id: "allTrichy",
  label: "All Trichy",
  icon: SearchCheck,
  filters: {
    ...REVIEW_QUEUE_FILTERS,
    level: "",
    status: "all",
    review: "all"
  }
}, {
  id: "google",
  label: "Google",
  icon: SearchCheck,
  filters: {
    ...REVIEW_QUEUE_FILTERS,
    origin: "google"
  }
}, {
  id: "missingPin",
  label: "No Pin",
  icon: PauseCircle,
  filters: {
    ...REVIEW_QUEUE_FILTERS,
    pincodeStatus: "without"
  }
}];

const formatImportSource = (value) => {
  if (!value) return "Manual";
  return String(value)
    .split("-")
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const describeError = (error) => {
  const payload = error?.response?.data || error?.message || error;
  if (!payload) return "Something went wrong.";
  if (typeof payload === "string") return payload;
  return payload.message || "Something went wrong.";
};

const getLocationStatus = (row) => {
  if (row.isActive) {
    return {
      label: "Live",
      tone: "green",
      tooltip: "Visible in public search."
    };
  }
  if (row.reviewStatus === "pending") {
    return {
      label: "Needs review",
      tone: "amber",
      tooltip: "Imported but not approved yet."
    };
  }
  if (row.reviewStatus === "rejected") {
    return {
      label: "Rejected",
      tone: "red",
      tooltip: "Hidden because it was rejected or deleted."
    };
  }
  return {
    label: "Hidden",
    tone: "neutral",
    tooltip: "Hidden from public search."
  };
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

  // Existing-value suggestions for the hierarchy fields, so Zone/Ward/Locality
  // text matches an existing doc's exact spelling instead of silently forking
  // the hierarchy (these are plain text fields, not references).
  const [districtOptions, setDistrictOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [localityOptions, setLocalityOptions] = useState([]);

  useEffect(() => {
    dispatch(getMasterLocationFieldOptions({ field: "district" })).then(setDistrictOptions);
  }, [dispatch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      dispatch(getMasterLocationFieldOptions({ field: "zone", district: formData.district })).then(setZoneOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [dispatch, formData.district]);

  useEffect(() => {
    const handle = setTimeout(() => {
      dispatch(getMasterLocationFieldOptions({ field: "ward", district: formData.district, zone: formData.zone })).then(setWardOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [dispatch, formData.district, formData.zone]);

  useEffect(() => {
    const handle = setTimeout(() => {
      dispatch(getMasterLocationFieldOptions({ field: "locality", district: formData.district, zone: formData.zone, ward: formData.ward })).then(setLocalityOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [dispatch, formData.district, formData.zone, formData.ward]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  // Filters
  const [filterDistrict, setFilterDistrict] = useState(REVIEW_QUEUE_FILTERS.district);
  const [filterZone, setFilterZone] = useState(REVIEW_QUEUE_FILTERS.zone);
  const [filterWard, setFilterWard] = useState(REVIEW_QUEUE_FILTERS.ward);
  const [filterLocality, setFilterLocality] = useState(REVIEW_QUEUE_FILTERS.locality);
  const [filterLevel, setFilterLevel] = useState(REVIEW_QUEUE_FILTERS.level);
  const [filterPincode, setFilterPincode] = useState("");
  const [filterPincodeStatus, setFilterPincodeStatus] = useState(REVIEW_QUEUE_FILTERS.pincodeStatus);
  const [filterStatus, setFilterStatus] = useState(REVIEW_QUEUE_FILTERS.status);
  const [filterReview, setFilterReview] = useState(REVIEW_QUEUE_FILTERS.review);
  const [filterImportSource, setFilterImportSource] = useState(REVIEW_QUEUE_FILTERS.importSource);
  const [filterOrigin, setFilterOrigin] = useState(REVIEW_QUEUE_FILTERS.origin);
  const [tableKey, setTableKey] = useState(0); // Reset pagination when filters change
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  // One feedback line for both single-row and bulk toggles. Toggling can make
  // a row vanish (the Review mode only lists off rows), so the reviewer needs
  // to be told what happened — and a failed toggle must not be silent.
  const [actionMessage, setActionMessage] = useState(null);

  const [filterZoneOptions, setFilterZoneOptions] = useState([]);

  // Ids currently mid-toggle, so a row's switch can be disabled while its
  // request is in flight instead of letting it be clicked repeatedly.
  const [togglingIds, setTogglingIds] = useState([]);

  // Filters stay collapsed by default — the quick-mode tabs cover the common
  // cases, and the active-filter chips below stay visible either way, so the
  // page never looks filter-heavy.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState({ anchorEl: null, row: null });

  const closeRowMenu = () => setRowMenu({ anchorEl: null, row: null });

  const getListOptions = (options = {}) => ({
    ...options,
    search: options.search?.trim() || "",
    district: filterDistrict,
    zone: filterZone,
    ward: filterWard,
    locality: filterLocality,
    pincode: filterPincode.trim(),
    pincodeStatus: filterPincodeStatus,
    status: filterStatus,
    reviewStatus: filterReview,
    importSource: filterImportSource,
    origin: filterOrigin,
    level: filterLevel || "all"
  });

  const applyFilterPreset = (filters) => {
    setFilterDistrict(filters.district || "");
    setFilterZone(filters.zone || "");
    setFilterWard(filters.ward || "");
    setFilterLocality(filters.locality || "");
    setFilterLevel(filters.level || "");
    setFilterPincode(filters.pincode || "");
    setFilterPincodeStatus(filters.pincodeStatus || "all");
    setFilterStatus(filters.status || "all");
    setFilterReview(filters.review || "all");
    setFilterImportSource(filters.importSource || "all");
    setFilterOrigin(filters.origin || "all");
  };

  const clearFilters = () => {
    setFilterDistrict("");
    setFilterZone("");
    setFilterWard("");
    setFilterLocality("");
    setFilterLevel("");
    setFilterPincode("");
    setFilterPincodeStatus("all");
    setFilterStatus("all");
    setFilterReview("all");
    setFilterImportSource("all");
    setFilterOrigin("all");
  };

  const currentFilterSnapshot = {
    district: filterDistrict,
    zone: filterZone,
    ward: filterWard,
    locality: filterLocality,
    level: filterLevel,
    pincode: filterPincode,
    pincodeStatus: filterPincodeStatus,
    status: filterStatus,
    review: filterReview,
    importSource: filterImportSource,
    origin: filterOrigin
  };

  const activeWorkModeId = WORK_MODES.find(mode =>
    Object.entries(mode.filters).every(([key, value]) => (currentFilterSnapshot[key] || "") === (value || ""))
  )?.id;

  const activeFilterChips = [
    filterDistrict && {
      key: "district",
      label: `District: ${filterDistrict}`,
      clear: () => {
        setFilterDistrict("");
        setFilterZone("");
        setFilterWard("");
        setFilterLocality("");
      }
    },
    filterZone && {
      key: "zone",
      label: `Zone: ${filterZone}`,
      clear: () => {
        setFilterZone("");
        setFilterWard("");
        setFilterLocality("");
      }
    },
    filterStatus !== "all" && { key: "status", label: filterStatus === "active" ? "Live only" : "Off only", clear: () => setFilterStatus("all") },
    filterReview !== "all" && { key: "review", label: filterReview === "pending" ? "Not reviewed" : `Review: ${filterReview}`, clear: () => setFilterReview("all") },
    filterOrigin !== "all" && { key: "origin", label: filterOrigin === "google" ? "Google-derived" : "Non-Google", clear: () => setFilterOrigin("all") },
    filterPincodeStatus !== "all" && { key: "pin-status", label: filterPincodeStatus === "with" ? "Has pincode" : "Missing pincode", clear: () => setFilterPincodeStatus("all") },
  ].filter(Boolean);

  // Reset pagination when filters change
  useEffect(() => {
    setTableKey(prev => prev + 1);
    setSelectedIds([]);
    setActionMessage(null);
  }, [
    filterDistrict,
    filterZone,
    filterWard,
    filterLocality,
    filterLevel,
    filterPincode,
    filterPincodeStatus,
    filterStatus,
    filterReview,
    filterImportSource,
    filterOrigin
  ]);

  useEffect(() => {
    const handle = setTimeout(() => {
      dispatch(getMasterLocationFieldOptions({
        field: "zone",
        district: filterDistrict,
        status: filterStatus,
        reviewStatus: filterReview,
        importSource: filterImportSource,
        origin: filterOrigin
      })).then(setFilterZoneOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [dispatch, filterDistrict, filterStatus, filterReview, filterImportSource, filterOrigin]);

  const handleToggleActive = (row, nextActive) => {
    setTogglingIds(prev => [...prev, row.id]);
    setActionMessage(null);
    dispatch(toggleMasterLocation(row.id, nextActive))
      .then(() => {
        setActionMessage({
          severity: "success",
          text: nextActive
            ? `${row.name} is approved and live.`
            : `${row.name} is hidden and back in the review queue.`
        });
        // Refetch rather than patching locally: enabling a location can
        // change other rows' public URL slugs, since siblings sharing a name
        // get qualified against each other.
        setTableRefreshKey(prev => prev + 1);
      })
      .catch((error) => {
        setActionMessage({
          severity: "error",
          text: `Could not update ${row.name}. ${describeError(error)}`
        });
      })
      .finally(() => setTogglingIds(prev => prev.filter(id => id !== row.id)));
  };

  const handleBulkToggle = (nextActive) => {
    if (!selectedIds.length) return;
    const count = selectedIds.length;
    setActionMessage(null);
    dispatch(bulkToggleMasterLocation(selectedIds, nextActive))
      .then((result) => {
        setActionMessage({
          severity: "success",
          text: `${result?.modified ?? count} location(s) ${nextActive ? "approved and made live" : "moved back to pending"}.`
        });
        setSelectedIds([]);
        setTableRefreshKey(prev => prev + 1);
      })
      .catch((error) => {
        setActionMessage({
          severity: "error",
          text: `Could not update the ${count} selected location(s). ${describeError(error)}`
        });
      });
  };

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
        setTableRefreshKey(prev => prev + 1);
      }).catch(() => {});
    } else {
      dispatch(createMasterLocation(formData)).then(() => {
        resetForm();
        setTableRefreshKey(prev => prev + 1);
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
        setDeleteDialogOpen(false);
        setSelectedRow(null);
        setTableRefreshKey(prev => prev + 1);
      }).catch(() => {});
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedRow(null);
  };

  const filterDistrictOptions = [...new Set([...districtOptions, filterDistrict].filter(Boolean))].sort();
  const rows = masterLocation.map((loc, index) => ({
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
    isActive: loc.isActive,
    reviewStatus: loc.reviewStatus || "approved",
    importSource: loc.importSource || "",
    sourceLabel: formatImportSource(loc.importSource),
    sourceOrigin: loc.importSource?.startsWith("gmaps") ? "Google" : loc.importSource ? "Imported" : "Manual",
    fullPlace: loc.hierarchyPath || [loc.state, loc.district, loc.zone, loc.ward, loc.locality].filter(Boolean).join(" > ")
  }));

  const currentPageIds = rows.map(row => row.id);
  const selectedOnPage = currentPageIds.filter(id => selectedIds.includes(id));
  const allCurrentPageSelected = currentPageIds.length > 0 && selectedOnPage.length === currentPageIds.length;
  const someCurrentPageSelected = selectedOnPage.length > 0 && !allCurrentPageSelected;

  const toggleSelectedRow = (id, checked) => {
    setSelectedIds(prev => {
      if (checked) return [...new Set([...prev, id])];
      return prev.filter(selectedId => selectedId !== id);
    });
  };

  const toggleCurrentPageSelection = (checked) => {
    setSelectedIds(prev => {
      if (!checked) return prev.filter(id => !currentPageIds.includes(id));
      return [...new Set([...prev, ...currentPageIds])];
    });
  };

  const columns = [{
    id: "select",
    label: (
      <Checkbox
        size="small"
        checked={allCurrentPageSelected}
        indeterminate={someCurrentPageSelected}
        onChange={(e) => toggleCurrentPageSelection(e.target.checked)}
        inputProps={{ "aria-label": "Select all visible locations" }}
      />
    ),
    sortable: false,
    renderCell: (_, row) => (
      <Checkbox
        size="small"
        checked={selectedIds.includes(row.id)}
        onChange={(e) => toggleSelectedRow(row.id, e.target.checked)}
        inputProps={{ "aria-label": `Select ${row.name}` }}
      />
    )
  }, {
    id: "name",
    label: "Name",
    sortable: false,
    renderCell: (value, row) => (
      <div className={cx("master-location-name-cell")}>
        <strong>{value}</strong>
        {row.alternateNames !== "-" && (
          <span>{row.alternateNames}</span>
        )}
      </div>
    )
  }, {
    id: "district",
    label: "District"
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
      <Badge tone={LEVEL_TONES[value] || "neutral"}>{value}</Badge>
    )
  }, {
    id: "pincode",
    label: "Pin"
  }, {
    id: "importSource",
    label: "Source",
    renderCell: (value, row) => (
      <Badge tone={SOURCE_TONES[row.sourceOrigin] || "neutral"}>{row.sourceLabel}</Badge>
    )
  }, {
    id: "status",
    label: "Status",
    sortable: false,
    renderCell: (_, row) => {
      const status = getLocationStatus(row);
      return (
        <div className={cx("master-location-status-cell")}>
          <Tooltip title={status.tooltip}>
            <span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </span>
          </Tooltip>
          <Tooltip title={row.isActive ? "Switch off to hide it." : "Switch on to approve and make it live."}>
            <span>
              <Switch
                size="small"
                checked={Boolean(row.isActive)}
                disabled={togglingIds.includes(row.id)}
                onChange={(e) => handleToggleActive(row, e.target.checked)}
              />
            </span>
          </Tooltip>
        </div>
      );
    }
  }, {
    id: "fullPlace",
    label: "Full Place",
    sortable: false,
    renderCell: (value) => (
      <span className={cx("master-location-full-place-cell")}>
        {value || "-"}
      </span>
    )
  }, {
    id: "action",
    label: "Action",
    sortable: false,
    renderCell: (_, row) => (
      <IconButton
        size="small"
        aria-label={`Actions for ${row.name}`}
        onClick={(event) => setRowMenu({ anchorEl: event.currentTarget, row })}
      >
        <MoreVertical size={16} />
      </IconButton>
    )
  }];

  // Plain text fields, rendered as-is.
  const fields = [{
    label: "State",
    name: "state"
  }, {
    label: "Pincode",
    name: "pincode"
  }, {
    label: "Alternate Names (comma separated)",
    name: "alternateNames"
  }];

  // Hierarchy fields: freeSolo autocomplete suggesting existing values scoped
  // to the parent fields already picked, so a new entry's Zone/Ward text
  // matches an existing doc's exact spelling instead of forking the hierarchy.
  const hierarchyFields = [{
    label: "District",
    name: "district",
    options: districtOptions
  }, {
    label: "Zone (e.g. Srirangam, Manapparai)",
    name: "zone",
    options: zoneOptions
  }, {
    label: "Ward",
    name: "ward",
    options: wardOptions
  }, {
    label: "Locality / Area",
    name: "locality",
    options: localityOptions
  }];

  const renderHierarchyField = ({ label, name, options }) => (
    <div key={name} className={cx("master-location-form-input-group")}>
      <label htmlFor={name} className={cx("master-location-input-label")}>
        {label}
      </label>
      <Autocomplete
        freeSolo
        id={name}
        options={options}
        inputValue={formData[name] || ""}
        onInputChange={(event, newInputValue) => {
          setFormData(prev => ({ ...prev, [name]: newInputValue }));
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            error={!!errors[name]}
            placeholder={`Existing ${label.split(" (")[0].toLowerCase()}s shown as you type`}
          />
        )}
      />
      {errors[name] && <p className="form-error-text">{errors[name]}</p>}
    </div>
  );

  const renderFilterAutocomplete = ({ label, value, options, onChange, placeholder }) => (
    <div className={cx("master-location-filter-field")} key={label}>
      <label className={cx("master-location-filter-label")}>
        {label}
      </label>
      <Autocomplete
        freeSolo
        size="small"
        options={options}
        value={value || null}
        inputValue={value || ""}
        onChange={(event, newValue) => onChange(newValue || "")}
        onInputChange={(event, newInputValue, reason) => {
          if (reason !== "reset") onChange(newInputValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
          />
        )}
      />
    </div>
  );

  const renderFilterSelect = ({ label, value, onChange, options }) => (
    <div className={cx("master-location-filter-field")} key={label}>
      <label className={cx("master-location-filter-label")}>
        {label}
      </label>
      <select
        className={cx("master-location-filter-select")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return <div className={cx("master-location-page")}>
      <header className={cx("master-location-header")}>
          <div>
              <h1 className={cx("master-location-page-title")}>Master Locations</h1>
              <p className={cx("master-location-page-subtitle")}>
                  Manage and review all location records in the system.
              </p>
          </div>
          <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="Master Location" listLabel="Master Locations" listCount={total || rows.length} />
      </header>

      {activeView === "form" && (
      <div className={cx("master-location-card")}>
          <h2 className={cx("master-location-card-title")}>
              {editingId ? "Edit Master Location" : "Add New Master Location"}
          </h2>

          <p className={cx("master-location-hint")}>
              Fill the hierarchy top-down: Zone → Ward → Locality. Leave Ward/Locality empty to
              create a zone-level entry. Slug, keywords and level are generated automatically.
          </p>

          <form onSubmit={handleSubmit} className={cx("master-location-form-grid")}>
              {(() => {
                const renderPlainField = ({ label, name }) => (
                  <div key={name} className={cx("master-location-form-input-group")}>
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
                    </div>
                );
                const [stateField, pincodeField, alternateNamesField] = fields;
                return <>
                  {renderPlainField(stateField)}
                  {hierarchyFields.map(renderHierarchyField)}
                  {renderPlainField(pincodeField)}
                  {renderPlainField(alternateNamesField)}
                </>;
              })()}

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
      <>
      <div className={cx("master-location-card master-location-mode-card")}>
          <div className={cx("master-location-mode-row")} role="tablist" aria-label="Location review modes">
            {WORK_MODES.map(mode => {
              const ModeIcon = mode.icon;
              const isActive = activeWorkModeId === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={cx(`master-location-mode-button ${isActive ? "master-location-mode-button-active" : ""}`)}
                  onClick={() => applyFilterPreset(mode.filters)}
                >
                  <ModeIcon size={15} />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
      </div>

      <div className={cx("master-location-card master-location-toolbar-card")}>
          <div className={cx("master-location-toolbar")}>
            <div className={cx("master-location-toolbar-row")}>
              <button
                type="button"
                className={cx(`master-location-filter-toggle ${filtersOpen ? "master-location-filter-toggle-open" : ""}`)}
                onClick={() => setFiltersOpen(open => !open)}
                aria-expanded={filtersOpen}
              >
                <SlidersHorizontal size={15} />
                <span>Filters</span>
                {activeFilterChips.length > 0 && (
                  <span className={cx("master-location-filter-badge")}>{activeFilterChips.length}</span>
                )}
              </button>
              <Button
                size="small"
                variant="text"
                startIcon={<FilterX size={15} />}
                onClick={clearFilters}
              >
                Clear all
              </Button>

              <div className={cx("master-location-toolbar-spacer")} />

              <span className={cx("master-location-selected-count")}>
                {selectedIds.length} selected
              </span>
              <Button
                size="small"
                variant="contained"
                color="success"
                disableElevation
                startIcon={<CheckCircle2 size={15} />}
                disabled={!selectedIds.length || loading}
                onClick={() => handleBulkToggle(true)}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<RotateCcw size={15} />}
                disabled={!selectedIds.length || loading}
                onClick={() => handleBulkToggle(false)}
              >
                Hold
              </Button>
            </div>

            {activeFilterChips.length > 0 && (
              <div className={cx("master-location-chip-row")}>
                {activeFilterChips.map(chip => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    size="small"
                    variant="outlined"
                    onDelete={chip.clear}
                  />
                ))}
              </div>
            )}

            {filtersOpen && (
            <div className={cx("master-location-filter-grid")}>
              {renderFilterAutocomplete({
                label: "District",
                value: filterDistrict,
                options: filterDistrictOptions,
                placeholder: "All districts",
                onChange: (value) => {
                  setFilterDistrict(value);
                  setFilterZone("");
                  setFilterWard("");
                  setFilterLocality("");
                }
              })}
              {renderFilterAutocomplete({
                label: "Zone",
                value: filterZone,
                options: filterZoneOptions,
                placeholder: "All zones",
                onChange: (value) => {
                  setFilterZone(value);
                  setFilterWard("");
                  setFilterLocality("");
                }
              })}
              {renderFilterSelect({
                label: "Live",
                value: filterStatus,
                onChange: setFilterStatus,
                options: [
                  { value: "all", label: "All" },
                  { value: "active", label: "Live" },
                  { value: "inactive", label: "Off" }
                ]
              })}
              {renderFilterSelect({
                label: "Review",
                value: filterReview,
                onChange: setFilterReview,
                options: [
                  { value: "all", label: "All" },
                  { value: "pending", label: "Not reviewed" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" }
                ]
              })}
              {renderFilterSelect({
                label: "Origin",
                value: filterOrigin,
                onChange: (value) => {
                  setFilterOrigin(value);
                  setFilterImportSource("all");
                },
                options: [
                  { value: "all", label: "All origins" },
                  { value: "google", label: "Google-derived" },
                  { value: "non-google", label: "Non-Google" }
                ]
              })}
            </div>
            )}

            {actionMessage && (
              <Alert
                severity={actionMessage.severity}
                className={cx("master-location-alert")}
                onClose={() => setActionMessage(null)}
              >
                {actionMessage.text}
              </Alert>
            )}
          </div>
      </div>

          <Box sx={{ width: "100%" }}>
              <CustomizedTable
                key={tableKey}
                title="Master Locations"
                data={rows}
                columns={columns}
                total={total}
                loading={loading}
                enableStatusFilter={false}
                refreshKey={tableRefreshKey}
                fetchData={(pageNo, pageSize, options) => {
                  dispatch(getAllMasterLocation({
                    pageNo,
                    pageSize,
                    options: getListOptions(options)
                  }));
                }}
              />
          </Box>
      </>
      )}

      <Menu
          anchorEl={rowMenu.anchorEl}
          open={Boolean(rowMenu.anchorEl)}
          onClose={closeRowMenu}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
          <MenuItem
            onClick={() => {
              const row = rowMenu.row;
              closeRowMenu();
              if (row) handleEdit(row);
            }}
          >
              <ListItemIcon><Pencil size={16} /></ListItemIcon>
              Edit
          </MenuItem>
          <MenuItem
            sx={{ color: "#b91c1c" }}
            onClick={() => {
              const row = rowMenu.row;
              closeRowMenu();
              if (row) handleDeleteClick(row);
            }}
          >
              <ListItemIcon><Trash2 size={16} color="#b91c1c" /></ListItemIcon>
              Delete
          </MenuItem>
      </Menu>

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
