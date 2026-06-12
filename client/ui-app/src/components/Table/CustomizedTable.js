import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useState, useEffect, useRef } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Checkbox, Box } from "@mui/material";
import styles from "./CustomizedTable.module.css";
import useDebounce from "./useDebounce.js";
import { throttle } from "../../utils/throttle.js";
const cx = createScopedClassNames(styles);
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
  initialStatusFilter = "all"
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [sortConfig, setSortConfig] = useState({
    orderBy: null,
    order: "asc"
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const throttledScrollRef = useRef(null);

  // Create throttled scroll handler (60ms)
  useEffect(() => {
    throttledScrollRef.current = throttle(e => {
      setIsScrolled(e.target.scrollTop > 0);
    }, 60);
  }, []);
  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);
  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);
  useEffect(() => {
    const options = {
      search: debouncedSearch,
      status: statusFilter,
      sortBy: sortConfig.orderBy,
      sortOrder: sortConfig.order
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
    let newSelected;
    if (selected.includes(id)) newSelected = selected.filter(x => x !== id);else newSelected = [...selected, id];
    setSelected(newSelected);
    onSelectRows?.(newSelected);
  };
  const isSelected = id => selected.includes(id);
  const handleSort = columnId => {
    setSortConfig(prev => {
      if (prev.orderBy === columnId) {
        if (prev.order === "asc") return {
          orderBy: columnId,
          order: "desc"
        };
        if (prev.order === "desc") return {
          orderBy: null,
          order: "asc"
        };
      }
      return {
        orderBy: columnId,
        order: "asc"
      };
    });
  };
  const renderSortIndicator = columnId => sortConfig.orderBy !== columnId ? <span className={cx("sort-indicator sort-indicator--off")}>⇵</span> : <span className={cx("sort-indicator")}>
        {sortConfig.order === "asc" ? "▲" : "▼"}
      </span>;
  const renderCellContent = (value, columnId, row) => {
    const col = columns.find(c => c.id === columnId);
    if (col?.renderCell) return col.renderCell(value, row);
    return value ?? "-";
  };
  const allVisibleSelected = data.length > 0 && data.every(row => selected.includes(row._id));
  return <Paper className={cx(`custom-table-container ${isScrolled ? "table-scrolled" : ""}`)}>
      
      <div className={cx("table-toolbar")}>
        <div className={cx("toolbar-left")}>
          <h3 className={cx("table-title")}>{title}</h3>
          <span className={cx("table-subtitle")}>{total} results</span>
        </div>

        <div className={cx("toolbar-right")}>

          {enableSearch && <div className={cx("search-box")}>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>}

          {enableStatusFilter && <div className={cx("filter-chips")}>
              {["all", "active", "inactive"].map(s => <button key={s} className={cx(`filter-chip ${statusFilter === s ? "filter-chip--active" : ""}`)} onClick={() => setStatusFilter(s)}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>)}
            </div>}

        </div>
      </div>

      <TableContainer className={cx("table-wrapper")} onScroll={e => throttledScrollRef.current?.(e)}>
        <Table stickyHeader className={cx("custom-table")}>

          <TableHead>
            <TableRow className={cx("custom-header-row")}>
              <TableCell padding="checkbox">
                <Checkbox checked={allVisibleSelected} indeterminate={selected.length > 0 && !allVisibleSelected} onChange={handleSelectAll} />
              </TableCell>

              {columns.map(col => <TableCell key={col.id} onClick={() => handleSort(col.id)}>
                  <span className={cx("header-content")}>
                    {col.label}
                    {renderSortIndicator(col.id)}
                  </span>
                </TableCell>)}
            </TableRow>
          </TableHead>

          <TableBody>
            {data.map(row => {
            const selectedRow = isSelected(row._id);
            return <TableRow key={row._id} className={cx(selectedRow ? "selected-row" : "")}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedRow} onChange={() => handleSelectRow(row._id)} />
                  </TableCell>

                  {columns.map(col => <TableCell key={col.id}>
                      {renderCellContent(row[col.id], col.id, row)}
                    </TableCell>)}
                </TableRow>;
          })}
          </TableBody>

        </Table>
      </TableContainer>

      <Box className={cx("pagination-wrapper")}>
        <TablePagination component="div" count={total} page={page} rowsPerPage={rowsPerPage} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} />
      </Box>

    </Paper>;
};
export default CustomizedTable;
