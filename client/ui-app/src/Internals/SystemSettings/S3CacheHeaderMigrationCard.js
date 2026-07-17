import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./BusinessImageMigrationCard.module.css";

const cx = createScopedClassNames(styles);
const API_URL = process.env.REACT_APP_API_URL;

const MIGRATION_SCOPES = [
  {
    scopeKey: "all",
    label: "All Folders",
    description:
      "Scan all supported S3 folders and update only objects with insufficient cache headers.",
  },
  {
    scopeKey: "businessList",
    label: "Business List",
    description: "Banners, galleries, and business images.",
  },
  {
    scopeKey: "category",
    label: "Category Images",
    description: "Category hero, card, and thumbnail images.",
  },
  {
    scopeKey: "seo",
    label: "SEO Blog Images",
    description: "SEO blog profile, page, and OG images.",
  },
  {
    scopeKey: "advertisements",
    label: "Advertisements",
    description: "Advertisement banner images.",
  },
  {
    scopeKey: "admin",
    label: "Admin Profiles",
    description: "Admin user profile images.",
  },
  {
    scopeKey: "user",
    label: "Customer Profiles",
    description: "Customer profile images.",
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

export default function S3CacheHeaderMigrationCard() {
  const [selectedScopeKey, setSelectedScopeKey] = useState("all");
  const [latestJob, setLatestJob] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [batchSize, setBatchSize] = useState(100);
  const [retryCount, setRetryCount] = useState(3);
  const [note, setNote] = useState("");

  const selectedScope = useMemo(
    () =>
      MIGRATION_SCOPES.find((scope) => scope.scopeKey === selectedScopeKey) ||
      MIGRATION_SCOPES[0],
    [selectedScopeKey],
  );

  const loadLatestJob = useCallback(
    async ({ silent = false, scopeKey = selectedScopeKey } = {}) => {
      if (!silent) {
        setRefreshing(true);
      }

      try {
        const response = await axiosInstance.get(
          `${API_URL}/admin/system-settings/s3-cache-header-migration/latest`,
          {
            headers: authHeaders(),
            params: { scopeKey },
          },
        );
        const scopedJob = response.data?.data || null;
        const globalActiveJob = response.data?.activeJob || null;

        setLatestJob(scopedJob);
        setActiveJob(globalActiveJob);

        if (
          globalActiveJob?.scopeKey &&
          globalActiveJob.scopeKey !== scopeKey
        ) {
          setSelectedScopeKey(globalActiveJob.scopeKey);
        }

        if (!silent) {
          setNote("");
        }
      } catch (error) {
        setNote(
          error.response?.data?.message ||
            error.message ||
            "Failed to load migration status",
        );
      } finally {
        if (!silent) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    },
    [selectedScopeKey],
  );

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
  }, [loadLatestJob, selectedScopeKey]);

  const displayedJob = activeJob || latestJob;
  const displayedJobId = displayedJob?._id;
  const displayedJobStatus = displayedJob?.status;

  useEffect(() => {
    if (
      !displayedJobId ||
      !["queued", "running"].includes(displayedJobStatus)
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadLatestJob({ silent: true, scopeKey: selectedScopeKey });
    }, 5000);

    return () => clearInterval(timer);
  }, [displayedJobId, displayedJobStatus, loadLatestJob, selectedScopeKey]);

  const totals = displayedJob?.totals || {};
  const progress = displayedJob?.progress || {};
  const totalObjects = Number(totals.candidateObjects || 0);
  const objectsDone = Number(progress.objectsScanned || 0);
  const phase = displayedJob?.phase || "scanning";
  const isDiscovering = phase === "scanning";
  const percent = useMemo(() => {
    if (isDiscovering || !totalObjects) return 0;
    return Math.max(
      0,
      Math.min(100, Math.round((objectsDone / totalObjects) * 100)),
    );
  }, [isDiscovering, objectsDone, totalObjects]);
  const active = ["queued", "running"].includes(displayedJobStatus);
  const paused = displayedJobStatus === "paused";
  const cancellable = ["queued", "running", "paused"].includes(
    displayedJobStatus,
  );
  const phaseLabel = isDiscovering
    ? "Discovering objects"
    : "Updating cache headers";
  const progressText = isDiscovering
    ? `${formatNumber(totalObjects)} objects discovered`
    : `${formatNumber(objectsDone)} / ${formatNumber(totalObjects)} (${percent}%)`;

  const startMigration = async () => {
    const message = `This will scan ${selectedScope.label.toLowerCase()} and update only objects that do not already have at least 1-year browser caching. Continue?`;

    if (!window.confirm(message)) {
      return;
    }

    setStarting(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/s3-cache-header-migration/start`,
        {
          scopeKey: selectedScopeKey,
          batchSize,
          retryCount,
        },
        { headers: authHeaders() },
      );
      const job = response.data?.data || null;

      setLatestJob(job);
      setActiveJob(job);
      setNote("Migration job started.");
    } catch (error) {
      setNote(
        error.response?.data?.message ||
          error.message ||
          "Failed to start migration",
      );
    } finally {
      setStarting(false);
    }
  };

  const resumeMigration = async () => {
    if (
      !displayedJobId ||
      !window.confirm("Resume this migration from its saved checkpoint?")
    ) {
      return;
    }

    setStarting(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/s3-cache-header-migration/resume`,
        { jobId: displayedJobId },
        { headers: authHeaders() },
      );
      const job = response.data?.data || null;

      setLatestJob(job);
      setActiveJob(job);
      setNote("Migration resumed from the saved checkpoint.");
    } catch (error) {
      setNote(
        error.response?.data?.message ||
          error.message ||
          "Failed to resume migration",
      );
    } finally {
      setStarting(false);
    }
  };

  const pauseMigration = async () => {
    if (
      !displayedJobId ||
      !window.confirm(
        "Pause the migration? Any in-flight S3 object will finish first.",
      )
    ) {
      return;
    }

    setPausing(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/s3-cache-header-migration/pause`,
        { jobId: displayedJobId },
        { headers: authHeaders() },
      );
      const job = response.data?.data || null;

      setLatestJob(job);
      setActiveJob(job);
      setNote("Migration paused.");
    } catch (error) {
      setNote(
        error.response?.data?.message ||
          error.message ||
          "Failed to pause migration",
      );
    } finally {
      setPausing(false);
    }
  };

  const cancelMigration = async () => {
    if (
      !displayedJobId ||
      !window.confirm("Cancel the migration? This will stop the job.")
    ) {
      return;
    }

    setCancelling(true);
    setNote("");

    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/s3-cache-header-migration/cancel`,
        { jobId: displayedJobId },
        { headers: authHeaders() },
      );

      setLatestJob(response.data?.data || null);
      setActiveJob(null);
      setNote("Migration cancelled.");
    } catch (error) {
      setNote(
        error.response?.data?.message ||
          error.message ||
          "Failed to cancel migration",
      );
    } finally {
      setCancelling(false);
    }
  };

  const failurePreview = Array.isArray(displayedJob?.failures)
    ? displayedJob.failures.slice(-5).reverse()
    : [];

  return (
    <div className={cx("migration-card")}>
      <div className={cx("migration-header")}>
        <div>
          <div className={cx("migration-eyebrow")}>Admin maintenance</div>
          <h3 className={cx("migration-title")}>S3 Cache Header Migration</h3>
          <p className={cx("migration-subtitle")}>
            Apply 1-year browser cache headers without changing image bytes.
            Objects already cached for at least one year are skipped without
            copying.
          </p>
        </div>
        <div
          className={cx(
            `status-chip ${statusTone[displayedJobStatus] || "neutral"}`,
          )}
        >
          {statusLabel[displayedJobStatus] || "No job yet"}
        </div>
      </div>

      <div className={cx("migration-warning")}>
        <strong>Restart-safe:</strong> one job runs at a time, progress is
        checkpointed, and a stopped server continues the job automatically after
        restart.
      </div>

      <div className={cx("migration-controls")}>
        <label className={cx("field-row", "scope-row")}>
          <span className={cx("form-input-label")}>Target folder</span>
          <select
            value={selectedScopeKey}
            onChange={(event) => setSelectedScopeKey(event.target.value)}
            className={cx("form-select-input")}
            disabled={Boolean(activeJob)}
          >
            {MIGRATION_SCOPES.map((scope) => (
              <option key={scope.scopeKey} value={scope.scopeKey}>
                {scope.label}
              </option>
            ))}
          </select>
        </label>

        <label className={cx("field-row")}>
          <span className={cx("form-input-label")}>Batch size</span>
          <input
            type="number"
            min="10"
            max="500"
            step="1"
            value={batchSize}
            onChange={(event) => setBatchSize(event.target.value)}
            className={cx("form-text-input")}
            disabled={Boolean(activeJob)}
          />
        </label>

        <label className={cx("field-row")}>
          <span className={cx("form-input-label")}>Retries per object</span>
          <input
            type="number"
            min="1"
            max="5"
            step="1"
            value={retryCount}
            onChange={(event) => setRetryCount(event.target.value)}
            className={cx("form-text-input")}
            disabled={Boolean(activeJob)}
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
          onClick={paused ? resumeMigration : startMigration}
          disabled={starting || (Boolean(activeJob) && !paused)}
        >
          {starting
            ? paused
              ? "Resuming..."
              : "Starting..."
            : paused
              ? "Resume Migration"
              : active
                ? "Migration Running"
                : "Start Migration"}
        </button>
        <button
          type="button"
          className={cx("action-button secondary")}
          onClick={pauseMigration}
          disabled={
            pausing || !["running", "queued"].includes(displayedJobStatus)
          }
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
          <div className={cx("summary-value")}>
            {formatNumber(totalObjects)}
          </div>
          <div className={cx("summary-label")}>
            {isDiscovering ? "Objects discovered" : "Objects in scope"}
          </div>
        </div>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>
            {formatNumber(progress.objectsUpdated)}
          </div>
          <div className={cx("summary-label")}>Updated</div>
        </div>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>
            {formatNumber(progress.objectsFailed)}
          </div>
          <div className={cx("summary-label")}>Failed</div>
        </div>
        <div className={cx("summary-card")}>
          <div className={cx("summary-value")}>
            {formatNumber(progress.objectsSkipped)}
          </div>
          <div className={cx("summary-label")}>Skipped</div>
        </div>
      </div>

      <div className={cx("progress-wrap")}>
        <div className={cx("progress-meta")}>
          <span>{phaseLabel}</span>
          <span>{progressText}</span>
        </div>
        <div className={cx("progress-bar")}>
          <div
            className={cx("progress-fill")}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className={cx("details-grid")}>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Status</div>
          <div className={cx("details-value")}>
            {statusLabel[displayedJobStatus] || "—"}
          </div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Scope</div>
          <div className={cx("details-value")}>
            {displayedJob?.scopeLabel || selectedScope.label}
          </div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Started</div>
          <div className={cx("details-value")}>
            {formatTime(displayedJob?.startedAt)}
          </div>
        </div>
        <div className={cx("details-card")}>
          <div className={cx("details-label")}>Finished</div>
          <div className={cx("details-value")}>
            {formatTime(displayedJob?.finishedAt)}
          </div>
        </div>
      </div>

      {displayedJob?.lastError ? (
        <div className={cx("error-box")}>
          <strong>Last error:</strong> {displayedJob.lastError}
        </div>
      ) : null}

      {failurePreview.length > 0 ? (
        <div className={cx("failure-block")}>
          <div className={cx("failure-title")}>
            Recent failures ({formatNumber(progress.objectsFailed)})
          </div>
          <div className={cx("failure-list")}>
            {failurePreview.map((failure, index) => (
              <div
                key={`${failure.s3Key || index}`}
                className={cx("failure-item")}
              >
                <div className={cx("failure-name")}>
                  {failure.s3Key || "Unknown object"}
                </div>
                <div className={cx("failure-message")}>
                  {failure.error || "Unknown error"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
