/**
 * Monitoring card for the S3 key restructure migration — step 2.3.
 *
 * No "Start" button by design (see the plan's "Read-only, plus stop. Never start."):
 * `--commit` writes, `--uri=` targeting, and conflict review all belong on the CLI,
 * where they can't be mis-clicked into rewriting the wrong database. This card only
 * ever reads the job doc the CLI writes as it runs, and can Pause/Cancel — both of
 * which are always safe, per the plan, and are the whole point of a phone-friendly
 * card.
 *
 * Liveness is derived from heartbeat age, NOT from `status` — a hard-killed CLI
 * process leaves `status: "running"` frozen at its last value forever, so trusting
 * status alone would show a dead run as healthy. See the plan's "The one thing this
 * card must get right".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "../../services/axiosInstance.js";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
import styles from "./BusinessImageMigrationCard.module.css";

const cx = createScopedClassNames(styles);
const API_URL = process.env.REACT_APP_API_URL;
const LEASE_DURATION_MS = 90 * 1000;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
};

const phaseLabel = {
  plan: "Planning",
  copy: "Copying to new keys",
  "verify-s3": "Verifying S3",
  rewrite: "Rewriting database",
  verify: "Verifying database",
  sweep: "Sweeping",
  reverse: "Reversing",
};

const statusLabel = {
  running: "Running",
  paused: "Paused",
  cancelled: "Cancelled",
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  failed: "Failed",
  queued: "Queued",
};

const statusTone = {
  running: "warning",
  paused: "neutral",
  cancelled: "neutral",
  completed: "success",
  completed_with_errors: "warning",
  failed: "danger",
  queued: "neutral",
};

/** Heartbeat-age-first liveness, per the plan — never let a frozen "running" read as healthy. */
const livenessOf = (job) => {
  if (!job) return { label: "No run yet", tone: "neutral" };
  if (job.status !== "running") {
    return { label: statusLabel[job.status] || job.status, tone: statusTone[job.status] || "neutral" };
  }
  const heartbeatAgeMs = job.lastHeartbeatAt ? Date.now() - new Date(job.lastHeartbeatAt).getTime() : Infinity;
  if (heartbeatAgeMs < LEASE_DURATION_MS) {
    return { label: "Running", tone: "warning" };
  }
  return { label: "⚠️ Worker not responding — run doctor then resume", tone: "danger" };
};

export default function S3KeyMigrationCard() {
  const [job, setJob] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");

  const loadLatest = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const [latestRes, runsRes] = await Promise.all([
        axiosInstance.get(`${API_URL}/admin/system-settings/s3-key-migration/latest`, { headers: authHeaders() }),
        axiosInstance.get(`${API_URL}/admin/system-settings/s3-key-migration/runs`, { headers: authHeaders(), params: { limit: 10 } }),
      ]);
      // The one currently-exclusive run (if any) is what matters most; fall back to
      // whatever was most recently touched so the card isn't blank between runs.
      setJob(latestRes.data?.activeJob || latestRes.data?.data || null);
      setRuns(Array.isArray(runsRes.data?.data) ? runsRes.data.data : []);
      if (!silent) setNote("");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to load migration status");
    } finally {
      if (!silent) {
        setRefreshing(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadLatest({ silent: true });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLatest]);

  const jobStatus = job?.status;
  useEffect(() => {
    if (jobStatus !== "running") return undefined;
    const timer = setInterval(() => loadLatest({ silent: true }), 5000);
    return () => clearInterval(timer);
  }, [jobStatus, loadLatest]);

  const liveness = useMemo(() => livenessOf(job), [job]);
  const counts = job?.counts || {};
  const total = Number(counts.total || 0);
  const done = Number(counts.done || 0);
  const percent = total ? Math.max(0, Math.min(100, Math.round((done / total) * 100))) : 0;
  const pausable = jobStatus === "running";
  const cancellable = ["running", "paused"].includes(jobStatus);

  const pauseRun = async () => {
    if (!job?._id || !window.confirm("Pause this run? The CLI will stop cleanly at its next checkpoint — nothing in flight is interrupted mid-write.")) return;
    setPausing(true);
    setNote("");
    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/s3-key-migration/pause`,
        { jobId: job._id },
        { headers: authHeaders() },
      );
      setJob(response.data?.data || null);
      setNote("Pause requested — the running CLI process will stop at its next checkpoint (usually within a few seconds).");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to pause");
    } finally {
      setPausing(false);
    }
  };

  const cancelRun = async () => {
    if (!job?._id || !window.confirm("Cancel this run? Resume it later from the CLI with `resume --run=... --commit` if you change your mind.")) return;
    setCancelling(true);
    setNote("");
    try {
      const response = await axiosInstance.post(
        `${API_URL}/admin/system-settings/s3-key-migration/cancel`,
        { jobId: job._id },
        { headers: authHeaders() },
      );
      setJob(response.data?.data || null);
      setNote("Cancel requested — the running CLI process will stop at its next checkpoint.");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className={cx("migration-card")}>
      <div className={cx("migration-header")}>
        <div>
          <div className={cx("migration-eyebrow")}>Admin maintenance</div>
          <h3 className={cx("migration-title")}>S3 Key Restructure</h3>
          <p className={cx("migration-subtitle")}>
            Read-only monitor for the S3 key migration CLI. Runs are started from the terminal only —
            this card can watch, pause, and cancel, never start.
          </p>
        </div>
        <div className={cx(`status-chip ${liveness.tone}`)}>{liveness.label}</div>
      </div>

      <div className={cx("migration-warning")}>
        <strong>Target database — read this before assuming anything:</strong>{" "}
        {job?.targetDb ? job.targetDb : job?.phase === "copy" ? "S3 only, no database" : "not yet targeting a database"}
      </div>

      {note ? <div className={cx("inline-note")}>{note}</div> : null}

      {!job ? (
        <div className={cx("inline-note")}>
          {loading ? "Loading…" : "No migration run has ever reported to this card. Start one from the CLI: node scripts/s3KeyMigration.js plan --uri=... --compare-uri=..."}
        </div>
      ) : (
        <>
          <div className={cx("migration-actions")}>
            <button type="button" className={cx("action-button secondary")} onClick={pauseRun} disabled={pausing || !pausable}>
              {pausing ? "Pausing..." : "Pause"}
            </button>
            <button type="button" className={cx("action-button danger")} onClick={cancelRun} disabled={cancelling || !cancellable}>
              {cancelling ? "Cancelling..." : "Cancel"}
            </button>
            <button type="button" className={cx("action-button secondary")} onClick={() => loadLatest()} disabled={loading || refreshing}>
              {refreshing ? "Refreshing..." : "Refresh Status"}
            </button>
          </div>

          <div className={cx("migration-summary")}>
            <div className={cx("summary-card")}>
              <div className={cx("summary-value")}>{formatNumber(total)}</div>
              <div className={cx("summary-label")}>Total</div>
            </div>
            <div className={cx("summary-card")}>
              <div className={cx("summary-value")}>{formatNumber(done)}</div>
              <div className={cx("summary-label")}>Done</div>
            </div>
            <div className={cx("summary-card")}>
              <div className={cx("summary-value")}>{formatNumber(counts.skipped)}</div>
              <div className={cx("summary-label")}>Skipped / stale</div>
            </div>
            <div className={cx("summary-card")}>
              <div className={cx("summary-value")}>{formatNumber(counts.failed)}</div>
              <div className={cx("summary-label")}>Failed</div>
            </div>
          </div>

          <div className={cx("progress-wrap")}>
            <div className={cx("progress-meta")}>
              <span>{phaseLabel[job.phase] || job.phase || "—"}</span>
              <span>{formatNumber(done)} / {formatNumber(total)} ({percent}%)</span>
            </div>
            <div className={cx("progress-bar")}>
              <div className={cx("progress-fill")} style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className={cx("details-grid")}>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Run ID</div>
              <div className={cx("details-value")}>{job.runId || "—"}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Scope</div>
              <div className={cx("details-value")}>{job.scopeKey || "—"}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Started</div>
              <div className={cx("details-value")}>{formatTime(job.startedAt)}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Finished</div>
              <div className={cx("details-value")}>{formatTime(job.finishedAt)}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Cursor</div>
              <div className={cx("details-value")}>{job.checkpoint?.cursor || "(clean boundary)"}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Last heartbeat</div>
              <div className={cx("details-value")}>{formatTime(job.lastHeartbeatAt)}</div>
            </div>
          </div>

          {job.lastError ? (
            <div className={cx("error-box")}>
              <strong>Last error:</strong> {job.lastError}
            </div>
          ) : null}
        </>
      )}

      {runs.length > 0 ? (
        <div className={cx("failure-block")}>
          <div className={cx("failure-title")}>Recent runs</div>
          <div className={cx("failure-list")}>
            {runs.map((r) => (
              <div key={r._id} className={cx("failure-item")}>
                <div className={cx("failure-name")}>
                  {r.runId} — {phaseLabel[r.phase] || r.phase} — {statusLabel[r.status] || r.status}
                  {r.targetDb ? ` (${r.targetDb})` : ""}
                </div>
                <div className={cx("failure-message")}>
                  {formatNumber(r.counts?.done)} / {formatNumber(r.counts?.total)} · updated {formatTime(r.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
