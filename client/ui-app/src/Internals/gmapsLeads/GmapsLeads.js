import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { createScopedClassNames } from '../../utils/createScopedClassNames';
import styles from './gmapsLeads.module.css';
import {
  getAllGmapsLeads,
  getGmapsLeadsStats,
  getGmapsLeadsDistincts,
  updateGmapsLeadStatus,
  setGmapsLeadToImport,
} from '../../redux/actions/gmapsLeadsAction';

const cx = createScopedClassNames(styles);

// ─── Status helpers ──────────────────────────────────────────────────────────

function getLeadStatus(lead) {
  if (lead.imported_to_main) return 'imported';
  if (lead.skip_import) return 'skipped';
  if (lead.hasMatch) return 'match';
  return 'available';
}

function StatusBadge({ lead }) {
  const s = getLeadStatus(lead);
  const map = {
    available: { cls: 'badge-available', icon: '🟢', text: 'Available' },
    imported:  { cls: 'badge-imported',  icon: '🔵', text: 'Imported' },
    skipped:   { cls: 'badge-skipped',   icon: '⚫', text: 'Skipped' },
    match:     { cls: 'badge-match',     icon: '🟡', text: 'Has Match' },
  };
  const { cls, icon, text } = map[s];
  return (
    <span className={cx('badge', cls)}>
      {icon} {text}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GmapsLeads() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  const { leads, total, stats, distincts, loading } = useSelector(
    (state) => state.gmapsLeadsReducer
  );

  // Pagination
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filter state (applied = what was last submitted)
  const getInitialFilters = useCallback(() => ({
    massclick_location: '',
    search_sector: '',
    massclick_category: '',
    status: searchParams.get('status') || 'all',
    min_rating: '',
    has_phone: searchParams.get('has_phone') === 'true',
    details_fetched: searchParams.get('details_fetched') === 'true',
    search: '',
    business_status: 'OPERATIONAL',
  }), [searchParams]);

  const [filters, setFilters] = useState(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState(filters);

  // Button loading state per lead id
  const [actionLoading, setActionLoading] = useState({});

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(getGmapsLeadsStats());
    dispatch(getGmapsLeadsDistincts());
  }, [dispatch]);

  useEffect(() => {
    dispatch(getAllGmapsLeads({ pageNo, pageSize, filters: appliedFilters }));
  }, [dispatch, pageNo, pageSize, appliedFilters]);

  // ── Filter handlers ────────────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleApply = useCallback(() => {
    setPageNo(1);
    setAppliedFilters(filters);
  }, [filters]);

  const handleClear = useCallback(() => {
    const blank = {
      massclick_location: '',
      search_sector: '',
      massclick_category: '',
      status: 'all',
      min_rating: '',
      has_phone: false,
      details_fetched: false,
      search: '',
      business_status: 'OPERATIONAL',
    };
    setFilters(blank);
    setPageNo(1);
    setAppliedFilters(blank);
  }, []);

  // Apply on Enter key in search box
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleApply();
  };

  // ── Status actions ─────────────────────────────────────────────────────────
  const handleStatusUpdate = useCallback(
    async (lead, patch) => {
      const key = `${lead._id}-${Object.keys(patch).join()}`;
      setActionLoading((prev) => ({ ...prev, [key]: true }));
      try {
        await dispatch(updateGmapsLeadStatus(lead._id, patch));
        enqueueSnackbar('Status updated', { variant: 'success' });
      } catch {
        enqueueSnackbar('Failed to update status', { variant: 'error' });
      } finally {
        setActionLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [dispatch, enqueueSnackbar]
  );

  // ── Use Data → pre-fill Business form ─────────────────────────────────────
  const handleUseData = useCallback(
    (lead) => {
      dispatch(setGmapsLeadToImport(lead));
      navigate('/dashboard/business');
      enqueueSnackbar(`Pre-filling form with: ${lead.name}`, { variant: 'info' });
    },
    [dispatch, navigate, enqueueSnackbar]
  );

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / pageSize) || 1;
  const start = (pageNo - 1) * pageSize + 1;
  const end = Math.min(pageNo * pageSize, total);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={cx('page-wrapper')}>

      {/* Page Header */}
      <div className={cx('page-header')}>
        <div>
          <div className={cx('page-title')}>GMaps Leads</div>
          <div className={cx('page-subtitle')}>
            Businesses scraped from Google Maps — use data to create listings
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={cx('stats-bar')}>
        <div className={cx('stat-card')}>
          <span className={cx('stat-icon')}>📋</span>
          <div>
            <div className={cx('stat-label')}>Total</div>
            <div className={cx('stat-value')}>{stats.total.toLocaleString()}</div>
          </div>
        </div>
        <div className={cx('stat-card')}>
          <span className={cx('stat-icon')}>🟢</span>
          <div>
            <div className={cx('stat-label')}>Available</div>
            <div className={cx('stat-value')}>{stats.available.toLocaleString()}</div>
          </div>
        </div>
        <div className={cx('stat-card')}>
          <span className={cx('stat-icon')}>🔵</span>
          <div>
            <div className={cx('stat-label')}>Imported</div>
            <div className={cx('stat-value')}>{stats.imported.toLocaleString()}</div>
          </div>
        </div>
        <div className={cx('stat-card')}>
          <span className={cx('stat-icon')}>⚫</span>
          <div>
            <div className={cx('stat-label')}>Skipped</div>
            <div className={cx('stat-value')}>{stats.skipped.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className={cx('filter-panel')}>
        <div className={cx('filter-row')}>

          {/* Location */}
          <div className={cx('filter-field')}>
            <label>Location</label>
            <select name="massclick_location" value={filters.massclick_location} onChange={handleFilterChange}>
              <option value="">All Locations</option>
              {distincts.locations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Sector */}
          <div className={cx('filter-field')}>
            <label>Sector</label>
            <select name="search_sector" value={filters.search_sector} onChange={handleFilterChange}>
              <option value="">All Sectors</option>
              {distincts.sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className={cx('filter-field')}>
            <label>Category</label>
            <select name="massclick_category" value={filters.massclick_category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {(distincts.categories || []).map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className={cx('filter-field')}>
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="all">All</option>
              <option value="available">🟢 Available</option>
              <option value="imported">🔵 Imported</option>
              <option value="skipped">⚫ Skipped</option>
            </select>
          </div>

          {/* Min Rating */}
          <div className={cx('filter-field')}>
            <label>Min Rating</label>
            <select name="min_rating" value={filters.min_rating} onChange={handleFilterChange}>
              <option value="">Any</option>
              <option value="1">1★ +</option>
              <option value="2">2★ +</option>
              <option value="3">3★ +</option>
              <option value="4">4★ +</option>
              <option value="4.5">4.5★ +</option>
            </select>
          </div>

          {/* Business Status */}
          <div className={cx('filter-field')}>
            <label>Biz Status</label>
            <select name="business_status" value={filters.business_status} onChange={handleFilterChange}>
              <option value="OPERATIONAL">Operational</option>
              <option value="">All</option>
              <option value="CLOSED_TEMPORARILY">Closed Temp</option>
              <option value="CLOSED_PERMANENTLY">Closed Perm</option>
            </select>
          </div>

          {/* Search */}
          <div className={cx('filter-field')} style={{ minWidth: 200 }}>
            <label>Search Name</label>
            <input
              type="text"
              name="search"
              placeholder="Search by name…"
              value={filters.search}
              onChange={handleFilterChange}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {/* Has Phone toggle */}
          <div className={cx('filter-field')}>
            <label>&nbsp;</label>
            <label className={cx('filter-toggle')}>
              <input
                type="checkbox"
                name="has_phone"
                checked={filters.has_phone}
                onChange={handleFilterChange}
              />
              <span>Has Phone</span>
            </label>
          </div>

          <div className={cx('filter-field')}>
            <label>&nbsp;</label>
            <label className={cx('filter-toggle')}>
              <input
                type="checkbox"
                name="details_fetched"
                checked={filters.details_fetched}
                onChange={handleFilterChange}
              />
              <span>Details fetched</span>
            </label>
          </div>

          {/* Buttons */}
          <div className={cx('filter-actions')}>
            <button className={cx('btn-apply')} onClick={handleApply}>Apply</button>
            <button className={cx('btn-clear')} onClick={handleClear}>Clear</button>
          </div>

        </div>
      </div>

      {/* Table */}
      <div className={cx('table-wrapper')}>
        <div className={cx('table-header-row')}>
          <span className={cx('table-title')}>Results</span>
          <span className={cx('total-count')}>
            {total.toLocaleString()} total
            {appliedFilters.massclick_location ? ` in ${appliedFilters.massclick_location}` : ''}
          </span>
        </div>

        {loading ? (
          <div className={cx('loading-state')}>Loading leads…</div>
        ) : leads.length === 0 ? (
          <div className={cx('empty-state')}>No results found. Try adjusting filters.</div>
        ) : (
          <>
            <div className={cx('table-container')}>
              <table>
                <thead>
                  <tr>
                    <th>Name / Address</th>
                    <th>Location</th>
                    <th>Query / Sector</th>
                    <th>Rating</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => {
                    const status = getLeadStatus(lead);
                    const canUse = status === 'available' || status === 'match';
                    const canSkip = status === 'available' || status === 'match';
                    const canReset = status === 'imported' || status === 'skipped';

                    return (
                      <tr key={lead._id}>
                        {/* Name */}
                        <td className={cx('name-cell')}>
                          <div className={cx('name-text')}>{lead.name}</div>
                          {lead.formatted_address && (
                            <div className={cx('address-text')}>{lead.formatted_address}</div>
                          )}
                        </td>

                        {/* Location */}
                        <td>{lead.massclick_location || '—'}</td>

                        {/* Query / Sector */}
                        <td>
                          <div>{lead.search_query || '—'}</div>
                          {lead.search_sector && lead.search_sector !== lead.search_query && (
                            <div style={{ fontSize: '0.76rem', color: '#aaa' }}>{lead.search_sector}</div>
                          )}
                        </td>

                        {/* Rating */}
                        <td className={cx('rating-cell')}>
                          {lead.rating != null ? (
                            <>
                              <span className={cx('star')}>★</span> {lead.rating}
                              <div className={cx('rating-count')}>
                                {lead.total_ratings?.toLocaleString() || 0} reviews
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#ccc' }}>—</span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className={cx('phone-cell')}>
                          {lead.phone ? lead.phone : <span className={cx('no-phone')}>—</span>}
                        </td>

                        {/* Status */}
                        <td>
                          <StatusBadge lead={lead} />
                        </td>

                        {/* Actions */}
                        <td>
                          <div className={cx('action-cell')}>
                            {canUse && (
                              <button
                                className={cx('btn-use')}
                                onClick={() => handleUseData(lead)}
                                title="Pre-fill Business form with this data"
                              >
                                Use Data
                              </button>
                            )}
                            {canSkip && (
                              <button
                                className={cx('btn-skip')}
                                disabled={actionLoading[`${lead._id}-skip_import`]}
                                onClick={() => handleStatusUpdate(lead, { skip_import: true })}
                                title="Mark as skipped"
                              >
                                Skip
                              </button>
                            )}
                            {canReset && (
                              <button
                                className={cx('btn-reset')}
                                disabled={actionLoading[`${lead._id}-imported_to_main,skip_import`]}
                                onClick={() =>
                                  handleStatusUpdate(lead, {
                                    imported_to_main: false,
                                    skip_import: false,
                                  })
                                }
                                title="Reset to Available"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className={cx('pagination')}>
              <span className={cx('pagination-info')}>
                Showing {start}–{end} of {total.toLocaleString()}
              </span>

              <div className={cx('pagination-controls')}>
                <select
                  className={cx('page-size-select')}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageNo(1);
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>

                <button
                  className={cx('page-btn')}
                  disabled={pageNo <= 1}
                  onClick={() => setPageNo(1)}
                >
                  «
                </button>
                <button
                  className={cx('page-btn')}
                  disabled={pageNo <= 1}
                  onClick={() => setPageNo((p) => p - 1)}
                >
                  ‹ Prev
                </button>

                <span className={cx('page-current')}>
                  {pageNo} / {totalPages}
                </span>

                <button
                  className={cx('page-btn')}
                  disabled={pageNo >= totalPages}
                  onClick={() => setPageNo((p) => p + 1)}
                >
                  Next ›
                </button>
                <button
                  className={cx('page-btn')}
                  disabled={pageNo >= totalPages}
                  onClick={() => setPageNo(totalPages)}
                >
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
