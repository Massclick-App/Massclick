import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Checkbox, Box } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import styles from "./CustomizedTable.module.css";
import useDebounce from "./useDebounce.js";
import { throttle } from "../../utils/throttle.js";

const cx = createScopedClassNames(styles);

const SKELETON_WIDTHS = [70, 55, 80, 45, 65, 75, 50, 85, 60, 40];
const getSkeletonWidth = i => `${SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}%`;

const DEFAULT_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const CustomizedTable = ({
  title = "Data Table",
  columns = [],
  data = [],
  total = 0,
  fetchData,
  onSelectRows,
  enableStatusFilter = true,
  enableSearch = true,
  initialSearchQuery = "",
  initialStatusFilter = "all",
  loading = false,
  bulkActions = [],
  onRowClick = null,
  statusOptions = null,
  renderEmpty = null,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [sortConfig, setSortConfig] = useState({ orderBy: null, order: "asc" });
  const [isScrolled, setIsScrolled] = useState(false);
  const throttledScrollRef = useRef(null);

  const resolvedStatusOptions = statusOptions ?? DEFAULT_STATUS_OPTIONS;

  useEffect(() => {
    throttledScrollRef.current = throttle(e => {
      setIsScrolled(e.target.scrollTop > 0);
    }, 60);
  }, []);

  useEffect(() => { setSearchQuery(initialSearchQuery); }, [initialSearchQuery]);
  useEffect(() => { setStatusFilter(initialStatusFilter); }, [initialStatusFilter]);

  useEffect(() => {
    const options = {
      search: debouncedSearch,
      status: statusFilter,
      sortBy: sortConfig.orderBy,
      sortOrder: sortConfig.order,
    };
    fetchData(page + 1, rowsPerPage, options);
    setSelected([]);
    if (onSelectRows) onSelectRows([]);
  }, [page, rowsPerPage, debouncedSearch, statusFilter, sortConfig]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = e => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleSelectAll = e => {
    if (e.target.checked) {
      const allIds = data.map(row => row._id);
      setSelected(allIds);
      onSelectRows?.(allIds);
    } else {
      setSelected([]);
      onSelectRows?.([]);
    }
  };

  const handleSelectRow = id => {
    const newSelected = selected.includes(id)
      ? selected.filter(x => x !== id)
      : [...selected, id];
    setSelected(newSelected);
    onSelectRows?.(newSelected);
  };

  const clearSelection = () => {
    setSelected([]);
    onSelectRows?.([]);
  };

  const isSelected = id => selected.includes(id);

  const handleSort = columnId => {
    setSortConfig(prev => {
      if (prev.orderBy === columnId) {
        if (prev.order === "asc") return { orderBy: columnId, order: "desc" };
        if (prev.order === "desc") return { orderBy: null, order: "asc" };
      }
      return { orderBy: columnId, order: "asc" };
    });
  };

  const renderSortIndicator = columnId =>
    sortConfig.orderBy !== columnId
      ? <span className={cx("sort-indicator sort-indicator--off")}>⇵</span>
      : <span className={cx("sort-indicator")}>{sortConfig.order === "asc" ? "▲" : "▼"}</span>;

  const renderCellContent = (value, columnId, row) => {
    const col = columns.find(c => c.id === columnId);
    if (col?.renderCell) return col.renderCell(value, row);
    return value ?? "-";
  };

  const allVisibleSelected = data.length > 0 && data.every(row => selected.includes(row._id));
  const hasSelection = selected.length > 0;

  return (
    <Paper className={cx(`custom-table-container ${isScrolled ? "table-scrolled" : ""}`)}>

      <div className={cx("table-toolbar")}>
        <div className={cx("toolbar-left")}>
          <h3 className={cx("table-title")}>{title}</h3>
          <span className={cx("table-subtitle")}>{total} results</span>
        </div>

        <div className={cx("toolbar-right")}>
          {enableSearch && (
            <div className={cx("search-box")}>
              <SearchRoundedIcon className={cx("search-icon")} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className={cx("search-clear")} onClick={() => setSearchQuery("")} aria-label="Clear search">
                  ✕
                </button>
              )}
            </div>
          )}

          {enableStatusFilter && (
            <div className={cx("filter-chips")}>
              {resolvedStatusOptions.map(opt => (
                <button
                  key={opt.value}
                  className={cx(`filter-chip ${statusFilter === opt.value ? "filter-chip--active" : ""}`)}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasSelection && (
        <div className={cx("selection-bar")}>
          <span className={cx("selection-count")}>{selected.length} selected</span>
          <div className={cx("selection-actions")}>
            {bulkActions.map((action, i) => (
              <button
                key={i}
                className={cx("bulk-action-btn")}
                style={action.color ? { "--action-color": action.color } : undefined}
                onClick={() => action.onClick(selected)}
              >
                {action.icon && <span className={cx("bulk-action-icon")}>{action.icon}</span>}
                {action.label}
              </button>
            ))}
            <button className={cx("selection-clear")} onClick={clearSelection}>✕ Clear</button>
          </div>
        </div>
      )}

      <TableContainer className={cx("table-wrapper")} onScroll={e => throttledScrollRef.current?.(e)}>
        <Table stickyHeader className={cx("custom-table")}>

          <TableHead>
            <TableRow className={cx("custom-header-row")}>
              <TableCell padding="checkbox" className={cx("checkbox-cell sticky-checkbox")}>
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={hasSelection && !allVisibleSelected}
                  onChange={handleSelectAll}
                  disabled={loading}
                />
              </TableCell>
              {columns.map(col => (
                <TableCell key={col.id} className={cx("custom-header-cell")} onClick={() => handleSort(col.id)}>
                  <span className={cx("header-content")}>
                    {col.label}
                    {renderSortIndicator(col.id)}
                  </span>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              Array.from({ length: rowsPerPage }).map((_, i) => (
                <TableRow key={`sk-${i}`} className={cx("skeleton-row")}>
                  <TableCell padding="checkbox" className={cx("checkbox-cell")}>
                    <div className={cx("skeleton-cell skeleton-checkbox")} />
                  </TableCell>
                  {columns.map((col, ci) => (
                    <TableCell key={col.id} className={cx("custom-body-cell")}>
                      <div className={cx("skeleton-cell")} style={{ width: getSkeletonWidth(ci) }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className={cx("empty-cell")}>
                  {renderEmpty ? renderEmpty() : (
                    <div className={cx("empty-state")}>
                      <span className={cx("empty-icon")}>📭</span>
                      <p className={cx("empty-title")}>No results found</p>
                      <p className={cx("empty-subtitle")}>Try adjusting your search or filters.</p>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              data.map(row => {
                const selectedRow = isSelected(row._id);
                return (
                  <TableRow
                    key={row._id}
                    className={cx(`custom-row ${selectedRow ? "selected-row" : ""} ${onRowClick ? "clickable-row" : ""}`)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    <TableCell
                      padding="checkbox"
                      className={cx("checkbox-cell")}
                      onClick={onRowClick ? e => e.stopPropagation() : undefined}
                    >
                      <Checkbox checked={selectedRow} onChange={() => handleSelectRow(row._id)} />
                    </TableCell>
                    {columns.map(col => (
                      <TableCell key={col.id} className={cx("custom-body-cell")}>
                        {renderCellContent(row[col.id], col.id, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>

        </Table>
      </TableContainer>

      <Box className={cx("pagination-wrapper")}>
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Box>

    </Paper>
  );
};

export default CustomizedTable;
