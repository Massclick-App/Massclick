import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Box } from "@mui/material";
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
  enableStatusFilter = true,
  enableSearch = true,
  initialSearchQuery = "",
  initialStatusFilter = "all",
  loading = false,
  onRowClick = null,
  statusOptions = null,
  renderEmpty = null,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [sortConfig, setSortConfig] = useState({ orderBy: null, order: "asc" });
  const [isScrolled, setIsScrolled] = useState(false);
  const throttledScrollRef = useRef(null);
  const searchInputRef = useRef(null);

  const resolvedStatusOptions = statusOptions ?? DEFAULT_STATUS_OPTIONS;

  useEffect(() => {
    throttledScrollRef.current = throttle(e => {
      setIsScrolled(e.target.scrollTop > 0);
    }, 60);
  }, []);

  useEffect(() => {
    if (!enableSearch) return;
    const handleKeyDown = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableSearch]);

  useEffect(() => { setSearchQuery(initialSearchQuery); }, [initialSearchQuery]);
  useEffect(() => { setStatusFilter(initialStatusFilter); }, [initialStatusFilter]);

  useEffect(() => {
    fetchData(page + 1, rowsPerPage, {
      search: debouncedSearch,
      status: statusFilter,
      sortBy: sortConfig.orderBy,
      sortOrder: sortConfig.order,
    });
  }, [page, rowsPerPage, debouncedSearch, statusFilter, sortConfig]);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = e => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleSort = columnId => {
    setPage(0);
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

  return (
    <Paper className={cx(`custom-table-container ${isScrolled ? "table-scrolled" : ""}`)}>

      <div className={cx("table-toolbar")}>
        <div className={cx("toolbar-left")}>
          <h3 className={cx("table-title")}>{title}</h3>
          <span className={cx("table-subtitle")}>{total} results</span>
        </div>

        <div className={cx("toolbar-right")}>
          {enableSearch && (
            <label className={cx("cir-search")}>
              <svg
                className={cx("cir-search__icon")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.34-4.34"></path>
              </svg>
              <input
                ref={searchInputRef}
                className={cx("cir-search__field")}
                type="search"
                placeholder="Search threads, contacts, replies"
                aria-label="Search"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
              <kbd className={cx("cir-search__kbd")}>⌘ K</kbd>
            </label>
          )}

          {enableStatusFilter && (
            <div className={cx("filter-chips")}>
              {resolvedStatusOptions.map(opt => (
                <button
                  key={opt.value}
                  className={cx(`filter-chip ${statusFilter === opt.value ? "filter-chip--active" : ""}`)}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(0);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TableContainer className={cx("table-wrapper")} onScroll={e => throttledScrollRef.current?.(e)}>
        <Table stickyHeader className={cx("custom-table")}>

          <TableHead>
            <TableRow className={cx("custom-header-row")}>
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
                  {columns.map((col, ci) => (
                    <TableCell key={col.id} className={cx("custom-body-cell")}>
                      <div className={cx("skeleton-cell")} style={{ width: getSkeletonWidth(ci) }} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow key="empty-state">
                <TableCell colSpan={columns.length} className={cx("empty-cell")}>
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
              data.map((row, rowIndex) => (
                <TableRow
                  key={row._id ?? row.id ?? `${page}-${rowIndex}`}
                  className={cx(`custom-row ${onRowClick ? "clickable-row" : ""}`)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map(col => (
                    <TableCell key={col.id} className={cx("custom-body-cell")}>
                      {renderCellContent(row[col.id], col.id, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
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
