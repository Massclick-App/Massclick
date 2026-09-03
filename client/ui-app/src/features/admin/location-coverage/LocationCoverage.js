import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Autocomplete, TextField, Tooltip, Dialog, DialogTitle, DialogContent, IconButton, CircularProgress } from "@mui/material";
import { CheckCircle2, MapPinOff, SlidersHorizontal, LayoutGrid, X } from "lucide-react";
import { getLocationCoverage, getLocationCategoryCoverage } from "state/actions/locationCoverageAction.js";
import { getMasterLocationFieldOptions } from "state/actions/masterLocationAction.js";
import { businessCategorySearch } from "state/actions/categoryAction.js";
import CustomizedTable from "shared/components/table/CustomizedTable.js";
import styles from "features/admin/location-coverage/locationCoverage.module.css";

const cx = createScopedClassNames(styles);

const LEVEL_TONES = {
  district: "red",
  zone: "amber",
  ward: "blue",
  locality: "green"
};

const COVERAGE_MODES = [{
  id: "all",
  label: "All Locations",
  icon: SlidersHorizontal,
  businessCoverage: "all"
}, {
  id: "has",
  label: "Has Business",
  icon: CheckCircle2,
  businessCoverage: "has"
}, {
  id: "needs",
  label: "Needs Business",
  icon: MapPinOff,
  businessCoverage: "needs"
}];

const getLocationStatus = (row) => {
  if (row.isActive) {
    return { label: "Live", tone: "green", tooltip: "Visible in public search." };
  }
  if (row.reviewStatus === "pending") {
    return { label: "Needs review", tone: "amber", tooltip: "Imported but not approved yet." };
  }
  if (row.reviewStatus === "rejected") {
    return { label: "Rejected", tone: "red", tooltip: "Hidden because it was rejected or deleted." };
  }
  return { label: "Hidden", tone: "neutral", tooltip: "Hidden from public search." };
};

const LocationCoverage = () => {
  const dispatch = useDispatch();
  const { searchCategory = [] } = useSelector((state) => state.categoryReducer || {});
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [businessPreviewLimit, setBusinessPreviewLimit] = useState(5);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);

  const [coverageMode, setCoverageMode] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterZone, setFilterZone] = useState("");
  const [filterLevel, setFilterLevel] = useState("locality");
  const [filterLiveStatus, setFilterLiveStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [categoryInput, setCategoryInput] = useState("");

  const [districtOptions, setDistrictOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const categorySearchTimeoutRef = useRef(null);

  const [breakdown, setBreakdown] = useState({ open: false, loading: false, error: "", data: null, locationName: "" });
  const [missingFilter, setMissingFilter] = useState("");

  const openBreakdown = (row) => {
    setMissingFilter("");
    setBreakdown({ open: true, loading: true, error: "", data: null, locationName: row.name });
    dispatch(getLocationCategoryCoverage(row.id))
      .then((data) => setBreakdown({ open: true, loading: false, error: "", data, locationName: row.name }))
      .catch((error) => setBreakdown({ open: true, loading: false, error: error.message, data: null, locationName: row.name }));
  };

  const closeBreakdown = () => setBreakdown((prev) => ({ ...prev, open: false }));

  const filteredMissing = useMemo(() => {
    const list = breakdown.data?.missing || [];
    const term = missingFilter.trim().toLowerCase();
    if (!term) return list;
    return list.filter((cat) => cat.toLowerCase().includes(term));
  }, [breakdown.data, missingFilter]);

  useEffect(() => {
    dispatch(getMasterLocationFieldOptions({ field: "district" })).then(setDistrictOptions);
  }, [dispatch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      dispatch(getMasterLocationFieldOptions({ field: "zone", district: filterDistrict })).then(setZoneOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [dispatch, filterDistrict]);

  // 500+ categories — search-as-you-type against the same endpoint the
  // business form uses, rather than ever loading the full list.
  useEffect(() => {
    if (categorySearchTimeoutRef.current) clearTimeout(categorySearchTimeoutRef.current);
    if (categoryInput.trim().length < 2) return undefined;
    categorySearchTimeoutRef.current = setTimeout(() => {
      dispatch(businessCategorySearch(categoryInput.trim()));
    }, 300);
    return () => clearTimeout(categorySearchTimeoutRef.current);
  }, [dispatch, categoryInput]);

  useEffect(() => {
    setTableRefreshKey((prev) => prev + 1);
  }, [coverageMode, filterDistrict, filterZone, filterLevel, filterLiveStatus, filterCategory]);

  const activeFilterChips = [
    filterDistrict && {
      key: "district",
      label: `District: ${filterDistrict}`,
      clear: () => { setFilterDistrict(""); setFilterZone(""); }
    },
    filterZone && { key: "zone", label: `Zone: ${filterZone}`, clear: () => setFilterZone("") },
    filterCategory && {
      key: "category",
      label: `Category: ${filterCategory}`,
      clear: () => { setFilterCategory(""); setCategoryInput(""); }
    },
    filterLiveStatus !== "all" && {
      key: "status",
      label: filterLiveStatus === "active" ? "Live only" : "Off only",
      clear: () => setFilterLiveStatus("all")
    },
  ].filter(Boolean);

  const clearFilters = () => {
    setFilterDistrict("");
    setFilterZone("");
    setFilterLevel("locality");
    setFilterLiveStatus("all");
    setFilterCategory("");
    setCategoryInput("");
  };

  const columns = [{
    id: "name",
    label: "Location",
    sortable: false,
    renderCell: (value, row) => (
      <div className={cx("location-coverage-name-cell")}>
        <strong>{value}</strong>
        <span>{row.fullPlace}</span>
      </div>
    )
  }, {
    id: "level",
    label: "Level",
    renderCell: (value) => (
      <span className={cx(`location-coverage-badge location-coverage-badge-${LEVEL_TONES[value] || "neutral"}`)}>
        {value}
      </span>
    )
  }, {
    id: "pincode",
    label: "Pin"
  }, {
    id: "status",
    label: "Status",
    sortable: false,
    renderCell: (_, row) => {
      const status = getLocationStatus(row);
      return (
        <div className={cx("location-coverage-status-cell")}>
          <Tooltip title={status.tooltip}>
            <span className={cx(`location-coverage-badge location-coverage-badge-${status.tone}`)}>
              {status.label}
            </span>
          </Tooltip>
        </div>
      );
    }
  }, {
    id: "businessCount",
    label: filterCategory ? `Coverage — ${filterCategory}` : "Coverage (any category)",
    sortable: true,
    renderCell: (value, row) => (
      <div className={cx("location-coverage-coverage-cell")}>
        <span className={cx(`location-coverage-badge location-coverage-badge-${value > 0 ? "green" : "red"}`)}>
          {value > 0 ? `${value} business${value === 1 ? "" : "es"}` : "No business"}
        </span>
        <Tooltip title="See which categories have a business here, and which don't">
          <button
            type="button"
            className={cx("location-coverage-breakdown-trigger")}
            onClick={() => openBreakdown(row)}
          >
            <LayoutGrid size={12} />
            <span>By category</span>
          </button>
        </Tooltip>
      </div>
    )
  }, {
    id: "businesses",
    label: filterCategory ? `Businesses in ${filterCategory}` : "Businesses (any category)",
    sortable: false,
    renderCell: (value, row) => {
      if (!value?.length) {
        return <span className={cx("location-coverage-business-empty")}>—</span>;
      }
      const remaining = row.businessCount - value.length;
      return (
        <div className={cx("location-coverage-business-list")}>
          {value.map((business) => (
            <div key={business._id} className={cx("location-coverage-business-row")}>
              <Tooltip title={business.isActive ? "Live" : "Not live"}>
                <span className={cx(`location-coverage-business-dot location-coverage-business-dot-${business.isActive ? "live" : "off"}`)} />
              </Tooltip>
              <span className={cx("location-coverage-business-name")}>{business.businessName || "(unnamed)"}</span>
            </div>
          ))}
          {remaining > 0 && (
            <span className={cx("location-coverage-business-more")}>+{remaining} more</span>
          )}
        </div>
      );
    }
  }];

  return <div className={cx("location-coverage-page")}>
      <header className={cx("location-coverage-header")}>
        <div>
          <h1 className={cx("location-coverage-page-title")}>Location Coverage</h1>
          <p className={cx("location-coverage-page-subtitle")}>
            Every master location, filterable by whether a business is already linked to it —
            use this to find where to prioritize new business signups. Pick a category below to
            see coverage for that category specifically — with 500+ categories, &ldquo;has a
            business&rdquo; across all of them at once isn&rsquo;t a useful signal.
          </p>
        </div>
      </header>

      <div className={cx("location-coverage-card location-coverage-mode-card")}>
        <div className={cx("location-coverage-mode-row")} role="tablist" aria-label="Coverage modes">
          {COVERAGE_MODES.map((mode) => {
            const ModeIcon = mode.icon;
            const isActive = coverageMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={cx(`location-coverage-mode-button ${isActive ? "location-coverage-mode-button-active" : ""}`)}
                onClick={() => setCoverageMode(mode.id)}
              >
                <ModeIcon size={15} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cx("location-coverage-card location-coverage-toolbar-card")}>
        <div className={cx("location-coverage-toolbar")}>
          <div className={cx("location-coverage-toolbar-row")}>
            <button
              type="button"
              className={cx(`location-coverage-filter-toggle ${filtersOpen ? "location-coverage-filter-toggle-open" : ""}`)}
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFilterChips.length > 0 && (
                <span>{activeFilterChips.length}</span>
              )}
            </button>
            <button type="button" className={cx("location-coverage-filter-toggle")} onClick={clearFilters}>
              Clear all
            </button>
            <div className={cx("location-coverage-toolbar-spacer")} />
            <span className={cx("location-coverage-hint")}>
              Counts reflect businesses linked directly to that location, not rolled up from its sub-areas.
              Up to {businessPreviewLimit} shown per row.
            </span>
          </div>

          {activeFilterChips.length > 0 && (
            <div className={cx("location-coverage-chip-row")}>
              {activeFilterChips.map((chip) => (
                <span key={chip.key} className={cx("location-coverage-badge location-coverage-badge-blue")} onClick={chip.clear} style={{ cursor: "pointer" }}>
                  {chip.label} ×
                </span>
              ))}
            </div>
          )}

          {filtersOpen && (
            <div className={cx("location-coverage-filter-grid")}>
              <div className={cx("location-coverage-filter-field")}>
                <label className={cx("location-coverage-filter-label")}>District</label>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={districtOptions}
                  value={filterDistrict || null}
                  inputValue={filterDistrict}
                  onChange={(e, newValue) => { setFilterDistrict(newValue || ""); setFilterZone(""); }}
                  onInputChange={(e, newInputValue, reason) => {
                    if (reason !== "reset") { setFilterDistrict(newInputValue); setFilterZone(""); }
                  }}
                  renderInput={(params) => <TextField {...params} placeholder="All districts" />}
                />
              </div>
              <div className={cx("location-coverage-filter-field")}>
                <label className={cx("location-coverage-filter-label")}>Zone</label>
                <Autocomplete
                  freeSolo
                  size="small"
                  options={zoneOptions}
                  value={filterZone || null}
                  inputValue={filterZone}
                  onChange={(e, newValue) => setFilterZone(newValue || "")}
                  onInputChange={(e, newInputValue, reason) => {
                    if (reason !== "reset") setFilterZone(newInputValue);
                  }}
                  renderInput={(params) => <TextField {...params} placeholder="All zones" />}
                />
              </div>
              <div className={cx("location-coverage-filter-field")}>
                <label className={cx("location-coverage-filter-label")}>Category</label>
                <Autocomplete
                  size="small"
                  options={searchCategory}
                  getOptionLabel={(option) => option?.category || ""}
                  isOptionEqualToValue={(option, value) => option.category === value.category}
                  value={filterCategory ? { category: filterCategory } : null}
                  inputValue={categoryInput}
                  onChange={(e, newValue) => setFilterCategory(newValue?.category || "")}
                  onInputChange={(e, newInputValue, reason) => {
                    setCategoryInput(newInputValue);
                    if (reason === "clear" || newInputValue === "") setFilterCategory("");
                  }}
                  noOptionsText={categoryInput.trim().length < 2 ? "Type at least 2 characters" : "No matching category"}
                  renderInput={(params) => <TextField {...params} placeholder="Search 500+ categories" />}
                />
              </div>
              <div className={cx("location-coverage-filter-field")}>
                <label className={cx("location-coverage-filter-label")}>Level</label>
                <select
                  className={cx("location-coverage-filter-select")}
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                >
                  <option value="all">All levels</option>
                  <option value="district">District</option>
                  <option value="zone">Zone</option>
                  <option value="ward">Ward</option>
                  <option value="locality">Locality</option>
                </select>
              </div>
              <div className={cx("location-coverage-filter-field")}>
                <label className={cx("location-coverage-filter-label")}>Live status</label>
                <select
                  className={cx("location-coverage-filter-select")}
                  value={filterLiveStatus}
                  onChange={(e) => setFilterLiveStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="active">Live</option>
                  <option value="inactive">Off</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomizedTable
        key={tableRefreshKey}
        title="Location Coverage"
        data={rows}
        columns={columns}
        total={total}
        loading={loading}
        enableStatusFilter={false}
        searchPlaceholder="Search locality, ward, zone, district, pincode"
        refreshKey={tableRefreshKey}
        fetchData={(pageNo, pageSize, options) => {
          setLoading(true);
          dispatch(getLocationCoverage({
            pageNo,
            pageSize,
            options: {
              search: options.search,
              sortBy: options.sortBy,
              sortOrder: options.sortOrder === "desc" ? "desc" : "asc",
              district: filterDistrict,
              zone: filterZone,
              level: filterLevel,
              status: filterLiveStatus,
              category: filterCategory,
              businessCoverage: COVERAGE_MODES.find((m) => m.id === coverageMode)?.businessCoverage || "all",
            }
          }))
            .then((response) => {
              const list = response?.data || [];
              setRows(list.map((loc, index) => ({
                id: loc._id || index,
                name: loc.locality || loc.ward || loc.zone || loc.district,
                district: loc.district,
                zone: loc.zone,
                ward: loc.ward,
                locality: loc.locality,
                level: loc.level,
                pincode: loc.pincode || (loc.pincodes?.length ? loc.pincodes.join(", ") : "-"),
                isActive: loc.isActive,
                reviewStatus: loc.reviewStatus || "approved",
                fullPlace: loc.hierarchyPath || [loc.state, loc.district, loc.zone, loc.ward, loc.locality].filter(Boolean).join(" > "),
                businessCount: loc.businessCount || 0,
                businesses: loc.businesses || [],
              })));
              setTotal(response?.total || 0);
              if (response?.businessPreviewLimit) setBusinessPreviewLimit(response.businessPreviewLimit);
            })
            .catch(() => {
              setRows([]);
              setTotal(0);
            })
            .finally(() => setLoading(false));
        }}
      />

      <Dialog open={breakdown.open} onClose={closeBreakdown} maxWidth="md" fullWidth>
        <DialogTitle className={cx("location-coverage-breakdown-title")}>
          <div>
            <div>{breakdown.locationName}</div>
            {breakdown.data?.location?.hierarchyPath && (
              <span className={cx("location-coverage-breakdown-subtitle")}>{breakdown.data.location.hierarchyPath}</span>
            )}
          </div>
          <IconButton size="small" onClick={closeBreakdown} aria-label="Close">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {breakdown.loading && (
            <div className={cx("location-coverage-breakdown-loading")}>
              <CircularProgress size={22} />
            </div>
          )}
          {!breakdown.loading && breakdown.error && (
            <p className={cx("location-coverage-breakdown-error")}>{breakdown.error}</p>
          )}
          {!breakdown.loading && breakdown.data && (
            <div className={cx("location-coverage-breakdown-grid")}>
              <div className={cx("location-coverage-breakdown-column")}>
                <h3 className={cx("location-coverage-breakdown-heading")}>
                  Has a business
                  <span className={cx("location-coverage-badge location-coverage-badge-green")}>
                    {breakdown.data.present.length}
                  </span>
                </h3>
                <div className={cx("location-coverage-breakdown-list")}>
                  {breakdown.data.present.length === 0 && (
                    <span className={cx("location-coverage-business-empty")}>No categories yet</span>
                  )}
                  {breakdown.data.present.map((item) => (
                    <div key={item.category} className={cx("location-coverage-breakdown-row")}>
                      <span>{item.category}</span>
                      <span className={cx("location-coverage-breakdown-count")}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className={cx("location-coverage-breakdown-column")}>
                <h3 className={cx("location-coverage-breakdown-heading")}>
                  No business yet
                  <span className={cx("location-coverage-badge location-coverage-badge-red")}>
                    {breakdown.data.missing.length}
                  </span>
                </h3>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={`Filter ${breakdown.data.missing.length} categories`}
                  value={missingFilter}
                  onChange={(e) => setMissingFilter(e.target.value)}
                  className={cx("location-coverage-breakdown-search")}
                />
                <div className={cx("location-coverage-breakdown-list")}>
                  {filteredMissing.length === 0 && (
                    <span className={cx("location-coverage-business-empty")}>No match</span>
                  )}
                  {filteredMissing.map((cat) => (
                    <div key={cat} className={cx("location-coverage-breakdown-row")}>
                      <span>{cat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>;
};

export default LocationCoverage;
