import React, { useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./BusinessImageMigrationCard.module.css";

const cx = createScopedClassNames(styles);
const API_URL = process.env.REACT_APP_API_URL;

const MIGRATION_SCOPES = [
  {
    scopeKey: "businessList",
    label: "Business List",
    description: "Banners, galleries, and KYC images with DB updates.",
    prefix: "businessList",
    progressLabel: "Businesses",
  },
  {
    scopeKey: "category",
    label: "Category Images",
    description: "Category hero, card, and thumbnail images.",
    prefix: "category",
    progressLabel: "Documents",
  },
  {
    scopeKey: "seo",
    label: "SEO Blog Images",
    description: "SEO blog profile, page, and OG images.",
    prefix: "seo",
    progressLabel: "Documents",
  },
  {
    scopeKey: "advertisements",
    label: "Advertisements",
    description: "Advertisement banner images.",
    prefix: "advertisements",
    progressLabel: "Documents",
  },
  {
    scopeKey: "admin",
    label: "Admin Profiles",
    description: "Admin user profile images.",
    prefix: "admin",
    progressLabel: "Documents",
  },
  {
    scopeKey: "user",
    label: "Customer Profiles",
    description: "Customer profile images from the user folder.",
    prefix: "user",
    progressLabel: "Documents",
  },
];

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const formatNumber = (value) => Number(value || 0).toLocaleString();

const statusLabel = {
  queued: "Queued",
  running: "Running",
  paused: "Paused",
  cancelled: "Cancelled",
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  failed: "Failed",
};

const statusTone = {
  queued: "neutral",
  running: "warning",
  paused: "neutral",
  cancelled: "neutral",
  completed: "success",
  completed_with_errors: "warning",
  failed: "danger",
};

const formatTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

export default function S3WebpMigrationCard() {
  const [selectedScopeKey, setSelectedScopeKey] = useState("businessList");
  const [latestJob, setLatestJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteOriginals, setDeleteOriginals] = useState(true);
  const [batchSize, setBatchSize] = useState(100);
  const [retryCount, setRetryCount] = useState(3);
  const [note, setNote] = useState("");

  const selectedScope = useMemo(
    () => MIGRATION_SCOPES.find((scope) => scope.scopeKey === selectedScopeKey) || MIGRATION_SCOPES[0],
    [selectedScopeKey]
  );

  const loadLatestJob = async ({ silent = false, scopeKey = selectedScopeKey } = {}) => {
    if (!silent) {
      setRefreshing(true);
    }

    try {
      const response = await axiosInstance.get(
        `${API_URL}/admin/system-settings/businesslist-webp-migration/latest?scopeKey=${encodeURIComponent(scopeKey)}`,
        { headers: authHeaders() }
      );
      setLatestJob(response.data?.data || null);
      setNote("");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to load migration status");
    } finally {
      if (!silent) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      await loadLatestJob({ silent: true, scopeKey: selectedScopeKey });
      if (!cancelled) {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedScopeKey]);

  useEffect(() => {
    if (!latestJob?._id) return undefined;
    if (!["queued", "running"].includes(latestJob.status)) return undefined;

    const timer = setInterval(() => {
      loadLatestJob({ silent: true, scopeKey: selectedScopeKey });
    }, 5000);

    return () => clearInterval(timer);
  }, [latestJob?._id, latestJob?.status, selectedScopeKey]);

  const totals = latestJob?.totals || {};
  const progress = latestJob?.progress || {};
  const totalDocuments = Number(totals.candidateDocuments || totals.candidateBusinesses || 0);
  const totalImages = Number(totals.candidateImages || 0);
  const documentsDone = Number(progress.documentsScanned || progress.businessesScanned || 0);
  const imagesDone = Number(progress.imagesScanned || 0);
  const percent = useMemo(() => {
    if (!totalDocuments) return 0;
    return Math.max(0, Math.min(100, Math.round((documentsDone / totalDocuments) * 100)));
  }, [documentsDone, totalDocuments]);
  const active = ["queued", "running"].includes(latestJob?.status);
  const paused = latestJob?.status === "paused";
  const cancellable = ["queued", "running", "paused"].includes(latestJob?.status);

  const startMigration = async () => {
    const baseMessage = paused
      ? "This will resume the paused migration from the last processed item."
      : deleteOriginals
        ? `This will convert the ${selectedScope.label.toLowerCase()} folder to WebP, update database keys where needed, and delete the old S3 originals after each success.`
        : `This will convert the ${selectedScope.label.toLowerCase()} folder to WebP and update database keys where needed, but it will keep the original S3 files.`;

    if (!window.confirm(`${baseMessage} Continue?`)) {
      return;
    }

    if (deleteOriginals && !window.confirm("Delete originals is ON. This is permanent for the old S3 objects. Start the migration now?")) {
      return;
    }

    setStarting(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/businesslist-webp-migration/start`,
        {
          scopeKey: selectedScopeKey,
          deleteOriginals,
          batchSize,
          retryCount,
        },
        { headers: authHeaders() }
      );

      setLatestJob(response.data?.data || null);
      if (response.data?.resumed) {
        setNote("Paused migration resumed.");
      } else if (response.data?.alreadyRunning) {
        setNote("An existing migration job is already running.");
      } else {
        setNote("Migration job started.");
      }
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to start migration");
    } finally {
      setStarting(false);
    }
  };

  const pauseMigration = async () => {
    if (!window.confirm("Pause the migration? It will stop after the current item finishes and can be resumed later.")) {
      return;
    }

    setPausing(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/businesslist-webp-migration/pause`,
        { scopeKey: selectedScopeKey },
        { headers: authHeaders() }
      );

      setLatestJob(response.data?.data || null);
      setNote("Migration paused.");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to pause migration");
    } finally {
      setPausing(false);
    }
  };

  const cancelMigration = async () => {
    if (!window.confirm("Cancel the migration? It will stop and mark the job as cancelled. You can start a new run later if needed.")) {
      return;
    }

    setCancelling(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/businesslist-webp-migration/cancel`,
        { scopeKey: selectedScopeKey },
        { headers: authHeaders() }
      );

      setLatestJob(response.data?.data || null);
      setNote("Migration cancelled.");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to cancel migration");
    } finally {
      setCancelling(false);
    }
  };

  const failurePreview = Array.isArray(latestJob?.failures) ? latestJob.failures.slice(0, 5) : [];

  return (
    <div className={cx("migration-card")}>
      <div className={cx("migration-header")}>
        <div>
          <div className={cx("migration-eyebrow")}>Admin maintenance</div>
          <h3 className={cx("migration-title")}>S3 WebP Migration</h3>
          <p className={cx("migration-subtitle")}>
            Convert legacy images to WebP one folder at a time, and update database keys where the folder is linked to records.
          </p>
        </div>
        <div className={cx(`status-chip ${statusTone[latestJob?.status] || "neutral"}`)}>
          {statusLabel[latestJob?.status] || "No job yet"}
        </div>
      </div>

      <div className={cx("migration-warning")}>
        <strong>Run one by one:</strong> pick a scope, run it, then move to the next folder. The job updates DB references only after the WebP upload succeeds.
      </div>

      <div className={cx("migration-controls")}>
        <label className={cx("field-row", "scope-row")}>
          <span className={cx("form-input-label")}>Target folder</span>
          <select value={selectedScopeKey} onChange={(e) => setSelectedScopeKey(e.target.value)} className={cx("form-select-input")}>
            {MIGRATION_SCOPES.map((scope) => (
              <option key={scope.scopeKey} value={scope.scopeKey}>
                {scope.label} ({scope.prefix})
              </option>
            ))}
          </select>
        </label>

        <label className={cx("checkbox-row")}>
          <input
            type="checkbox"
            checked={deleteOriginals}
            onChange={(e) => setDeleteOriginals(e.target.checked)}
          />
          <span>Delete original S3 objects after successful replacement</span>
        </label>

        <label className={cx("field-row")}>
          <span className={cx("form-input-label")}>Batch size</span>
          <input
            type="number"
            min="10"
            max="500"
            step="1"
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            className={cx("form-text-input")}
          />
        </label>

        <label className={cx("field-row")}>
          <span className={cx("form-input-label")}>Retries per image</span>
          <input
            type="number"
            min="1"
            max="5"
            step="1"
            value={retryCount}
            onChange={(e) => setRetryCount(e.target.value)}
            className={cx("form-text-input")}
          />
        </label>
      </div>

      <div className={cx("scope-note")}>
        <strong>{selectedScope.label}:</strong> {selectedScope.description}
      </div>

      <div className={cx("migration-actions")}>
        <button
          type="button"
          className={cx("action-button primary")}
          onClick={startMigration}
          disabled={starting || (active && !paused)}
        >
          {starting ? (paused ? "Resuming..." : "Starting...") : paused ? "Resume Migration" : active ? "Migration Running" : "Start Migration"}
        </button>
        <button
          type="button"
          className={cx("action-button secondary")}
          onClick={pauseMigration}
          disabled={pausing || !["running", "queued"].includes(latestJob?.status)}
        >
          {pausing ? "Pausing..." : "Pause"}
        </button>
        <button
          type="button"
          className={cx("action-button danger")}
          onClick={cancelMigration}
          disabled={cancelling || !cancellable}
        >
          {cancelling ? "Cancelling..." : "Cancel"}
        </button>
        <button
          type="button"
          className={cx("action-button secondary")}
          onClick={() => loadLatestJob({ scopeKey: selectedScopeKey })}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {note ? <div className={cx("inline-note")}>{note}</div> : null}

      <div className={cx("migration-summary")}>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>{formatNumber(totalDocuments)}</div>
          <div className={cx("summary-label")}>{selectedScope.progressLabel} in scope</div>
        </div>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>{formatNumber(totalImages)}</div>
          <div className={cx("summary-label")}>Images to inspect</div>
        </div>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>{formatNumber(imagesDone)}</div>
          <div className={cx("summary-label")}>Converted</div>
        </div>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>{formatNumber(progress.imagesFailed)}</div>
          <div className={cx("summary-label")}>Failed</div>
        </div>
      </div>

      <div className={cx("progress-wrap")}>
        <div className={cx("progress-meta")}>
          <span>{selectedScope.progressLabel} progress</span>
          <span>{formatNumber(documentsDone)} / {formatNumber(totalDocuments)} ({percent}%)</span>
        </div>
        <div className={cx("progress-bar")}>
          <div className={cx("progress-fill")} style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className={cx("details-grid")}>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Status</div>
          <div className={cx("details-value")}>{statusLabel[latestJob?.status] || "—"}</div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Scope</div>
          <div className={cx("details-value")}>{latestJob?.scopeLabel || selectedScope.label}</div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Started</div>
          <div className={cx("details-value")}>{formatTime(latestJob?.startedAt)}</div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Finished</div>
          <div className={cx("details-value")}>{formatTime(latestJob?.finishedAt)}</div>
        </div>
      </div>

      <div className={cx("details-grid compact")}>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Scanned</div>
          <div className={cx("details-value")}>{formatNumber(progress.documentsScanned || progress.businessesScanned)}</div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Updated</div>
          <div className={cx("details-value")}>{formatNumber(progress.documentsUpdated || progress.businessesUpdated)}</div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Images skipped</div>
          <div className={cx("details-value")}>{formatNumber(progress.imagesSkipped)}</div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Deleted originals</div>
          <div className={cx("details-value")}>{formatNumber(progress.originalsDeleted)}</div>
        </div>
      </div>

      {latestJob?.lastError ? (
        <div className={cx("error-box")}>
          <strong>Last error:</strong> {latestJob.lastError}
        </div>
      ) : null}

      {failurePreview.length > 0 ? (
        <div className={cx("failure-block")}>
          <div className={cx("failure-title")}>Recent failures</div>
          <div className={cx("failure-list")}>
            {failurePreview.map((failure, index) => (
              <div key={`${failure.sourceKey || index}`} className={cx("failure-item")}>
                <div className={cx("failure-name")}>{failure.documentLabel || failure.businessName || "Unknown item"}</div>
                <div className={cx("failure-path")}>
                  {failure.fieldPath || "unknown field"} · {failure.sourceKey || "unknown key"}
                </div>
                <div className={cx("failure-message")}>{failure.error || "Unknown error"}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
