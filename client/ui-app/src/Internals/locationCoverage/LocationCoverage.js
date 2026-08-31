import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Autocomplete, TextField, Tooltip } from "@mui/material";
import { CheckCircle2, MapPinOff, SlidersHorizontal } from "lucide-react";
import { getLocationCoverage } from "../../redux/actions/locationCoverageAction.js";
import { getMasterLocationFieldOptions } from "../../redux/actions/masterLocationAction.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import styles from "./locationCoverage.module.css";

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

  const [districtOptions, setDistrictOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);

  useEffect(() => {
    dispatch(getMasterLocationFieldOptions({ field: "district" })).then(setDistrictOptions);
  }, [dispatch]);

  useEffect(() => {
    const handle = setTimeout(() => {
      dispatch(getMasterLocationFieldOptions({ field: "zone", district: filterDistrict })).then(setZoneOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [dispatch, filterDistrict]);

  useEffect(() => {
    setTableRefreshKey((prev) => prev + 1);
  }, [coverageMode, filterDistrict, filterZone, filterLevel, filterLiveStatus]);

  const activeFilterChips = [
    filterDistrict && {
      key: "district",
      label: `District: ${filterDistrict}`,
      clear: () => { setFilterDistrict(""); setFilterZone(""); }
    },
    filterZone && { key: "zone", label: `Zone: ${filterZone}`, clear: () => setFilterZone("") },
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
    label: "Coverage",
    sortable: true,
    renderCell: (value) => (
      <div className={cx("location-coverage-coverage-cell")}>
        <span className={cx(`location-coverage-badge location-coverage-badge-${value > 0 ? "green" : "red"}`)}>
          {value > 0 ? `${value} business${value === 1 ? "" : "es"}` : "No business"}
        </span>
      </div>
    )
  }, {
    id: "businesses",
    label: "Businesses",
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
            use this to find where to prioritize new business signups.
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
    </div>;
};

export default LocationCoverage;
