/**
 * Control + monitoring card for the S3 key restructure migration — step 2.3, extended
 * 2026-08-13 to let the card actually start runs (`plan`/`copy`/`verify-s3`/
 * `rewrite`/`verify`), not just watch them. `reverse`/`rollback-copies`/`doctor`/
 * `resume` stay CLI-only for now — a deliberate later phase.
 *
 * Every action that would pass `--commit` server-side goes through
 * `TypeToConfirmModal` — the operator must type the exact phrase the backend
 * independently checks (`copy:<scope>` / `rewrite:<scope>`, escalating to the literal
 * "RUN ON PROD" once `target === "prod"`) before the button even enables. A misclick
 * alone can never trigger a write.
 *
 * `plan` mints a fresh run but writes no job doc of its own (only `copy`/`rewrite` are
 * job-doc-tracked — see utils/s3MigrationJobTracking.js), so `activeRunId`/
 * `activeScope` below are local UI state, not derived from the polled `job`. Once a
 * `copy`/`rewrite` is started against that runId, the existing `latest` poll picks up
 * the job doc it creates, same as before.
 *
 * Liveness is derived from heartbeat age, NOT from `status` — a hard-killed CLI
 * process leaves `status: "running"` frozen at its last value forever, so trusting
 * status alone would show a dead run as healthy. See the plan's "The one thing this
 * card must get right".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import axiosInstance from "shared/services/axiosInstance.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/admin/system-settings/BusinessImageMigrationCard.module.css";
import TypeToConfirmModal from "features/admin/system-settings/TypeToConfirmModal.js";

const cx = createScopedClassNames(styles);
const API_URL = process.env.REACT_APP_API_URL;
const LEASE_DURATION_MS = 90 * 1000;
const BASE = `${API_URL}/admin/system-settings/s3-key-migration`;
// plan/verify-s3/verify run the CLI to completion server-side and return its full
// output in one response (no job-doc polling) — the shared axiosInstance's 20s
// default is tuned for ordinary admin calls and is too tight for a real scope like
// `category` (900+ manifest rows across both live DBs).
const LONG_RUNNING_TIMEOUT_MS = 120 * 1000;

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

/** Mirrors s3KeyMigrationController.js's expectedConfirmPhrase — the backend checks
 * this independently, so a mismatch here just means the button never enables, not a
 * security gap. */
const confirmPhrase = ({ subcommand, scope, target }) => (target === "prod" ? "RUN ON PROD" : `${subcommand}:${scope}`);

export default function S3KeyMigrationCard() {
  const [job, setJob] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [note, setNote] = useState("");
  const [errorNote, setErrorNote] = useState("");

  // --- new-plan controls ---
  const [scopes, setScopes] = useState([]);
  const [selectedScope, setSelectedScope] = useState("all");
  const [planning, setPlanning] = useState(false);

  // --- the run currently being worked, independent of the polled job doc since
  // `plan` alone never creates one ---
  const [activeRunId, setActiveRunId] = useState("");
  const [activeScope, setActiveScope] = useState("");
  const [conflictCount, setConflictCount] = useState(null);
  const [rewriteTarget, setRewriteTarget] = useState("dev");

  const [copyingDryRun, setCopyingDryRun] = useState(false);
  const [verifyingS3, setVerifyingS3] = useState(false);
  const [rewritingDryRun, setRewritingDryRun] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastActionOutput, setLastActionOutput] = useState("");

  // { subcommand, scope, target, title, params, endpoint, extraBody } | null
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const loadLatest = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const [latestRes, runsRes] = await Promise.all([
        axiosInstance.get(`${BASE}/latest`, { headers: authHeaders() }),
        axiosInstance.get(`${BASE}/runs`, { headers: authHeaders(), params: { limit: 10 } }),
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
      try {
        const scopesRes = await axiosInstance.get(`${BASE}/scopes`, { headers: authHeaders() });
        if (!cancelled) setScopes(Array.isArray(scopesRes.data?.data) ? scopesRes.data.data : []);
      } catch {
        // Non-fatal — the scope <select> just falls back to "all" only.
      }
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
      const response = await axiosInstance.post(`${BASE}/pause`, { jobId: job._id }, { headers: authHeaders() });
      setJob(response.data?.data || null);
      setNote("Pause requested — the running CLI process will stop at its next checkpoint (usually within a few seconds).");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to pause");
    } finally {
      setPausing(false);
    }
  };

  const cancelJobRun = async () => {
    if (!job?._id || !window.confirm("Cancel this run? Resume it later from the CLI with `resume --run=... --commit` if you change your mind.")) return;
    setCancelling(true);
    setNote("");
    try {
      const response = await axiosInstance.post(`${BASE}/cancel`, { jobId: job._id }, { headers: authHeaders() });
      setJob(response.data?.data || null);
      setNote("Cancel requested — the running CLI process will stop at its next checkpoint.");
    } catch (error) {
      setNote(error.response?.data?.message || error.message || "Failed to cancel");
    } finally {
      setCancelling(false);
    }
  };

  const runPlan = async () => {
    setPlanning(true);
    setErrorNote("");
    setLastActionOutput("");
    try {
      const response = await axiosInstance.post(
        `${BASE}/plan`,
        { scope: selectedScope },
        { headers: authHeaders(), timeout: LONG_RUNNING_TIMEOUT_MS },
      );
      const data = response.data?.data || {};
      setActiveRunId(data.runId || "");
      setActiveScope(data.scope || selectedScope);
      setConflictCount(typeof data.conflictCount === "number" ? data.conflictCount : null);
      setLastActionOutput(data.output || "");
      setNote(`Plan complete — runId ${data.runId}. ${data.conflictCount ? `${data.conflictCount} conflicts — review before copying.` : "No conflicts."}`);
    } catch (error) {
      setErrorNote(error.response?.data?.message || error.message || "Failed to run plan");
      setLastActionOutput(error.response?.data?.data?.output || "");
    } finally {
      setPlanning(false);
    }
  };

  const runDryRun = async ({ endpoint, body, setBusy, label, timeout }) => {
    setBusy(true);
    setErrorNote("");
    setLastActionOutput("");
    try {
      const response = await axiosInstance.post(`${BASE}/${endpoint}`, body, { headers: authHeaders(), timeout });
      const data = response.data?.data || {};
      setLastActionOutput(data.output || "");
      setNote(`${label} finished.`);
      loadLatest({ silent: true });
    } catch (error) {
      setErrorNote(error.response?.data?.message || error.message || `Failed to run ${label}`);
      setLastActionOutput(error.response?.data?.output || error.response?.data?.data?.output || "");
    } finally {
      setBusy(false);
    }
  };

  const openCommitConfirm = ({ subcommand, endpoint, target, title, params, extraBody }) => {
    const scope = activeScope || selectedScope;
    setConfirmModal({ subcommand, endpoint, target, title, params, extraBody, scope });
  };

  const submitConfirm = async (typedValue) => {
    if (!confirmModal) return;
    setConfirmBusy(true);
    setErrorNote("");
    try {
      const response = await axiosInstance.post(
        `${BASE}/${confirmModal.endpoint}`,
        { ...confirmModal.extraBody, commit: true, confirm: typedValue },
        { headers: authHeaders() },
      );
      setLastActionOutput(response.data?.data?.output || "");
      setNote(`${confirmModal.title} started.`);
      setConfirmModal(null);
      loadLatest({ silent: true });
    } catch (error) {
      setErrorNote(error.response?.data?.message || error.message || "Commit failed");
    } finally {
      setConfirmBusy(false);
    }
  };

  const hasRun = Boolean(activeRunId);

  return (
    <div className={cx("migration-card")}>
      <div className={cx("migration-header")}>
        <div>
          <div className={cx("migration-eyebrow")}>Admin maintenance</div>
          <h3 className={cx("migration-title")}>S3 Key Restructure</h3>
          <p className={cx("migration-subtitle")}>
            Plan, copy, verify, and rewrite from here. `reverse`/`rollback-copies`/`doctor`/`resume` are
            still CLI-only. Every commit requires typing an exact confirmation phrase.
          </p>
        </div>
        <div className={cx(`status-chip ${liveness.tone}`)}>{liveness.label}</div>
      </div>

      <div className={cx("migration-warning")}>
        <strong>Target database — read this before assuming anything:</strong>{" "}
        {job?.targetDb ? job.targetDb : job?.phase === "copy" ? "S3 only, no database" : "not yet targeting a database"}
      </div>

      {note ? <div className={cx("inline-note")}>{note}</div> : null}
      {errorNote ? <div className={cx("error-box")}><strong>Error:</strong> {errorNote}</div> : null}

      <div className={cx("migration-controls")}>
        <div className={cx("field-row")}>
          <span>New plan — scope</span>
          <select value={selectedScope} onChange={(event) => setSelectedScope(event.target.value)} disabled={planning}>
            <option value="all">all</option>
            {scopes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className={cx("migration-actions")}>
          <button type="button" className={cx("action-button primary")} onClick={runPlan} disabled={planning}>
            {planning ? "Planning..." : "Run plan"}
          </button>
        </div>
        <div className={cx("scope-note")}>
          Plan always reads both dev and prod — it only ever writes to local disk, never to S3 or a
          database, so it needs no confirmation.
        </div>
      </div>

      {hasRun ? (
        <div className={cx("migration-controls")}>
          <div className={cx("details-grid compact")}>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Working run</div>
              <div className={cx("details-value")}>{activeRunId}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Scope</div>
              <div className={cx("details-value")}>{activeScope}</div>
            </div>
            <div className={cx("details-card")}>
              <div className={cx("details-label")}>Conflicts</div>
              <div className={cx("details-value")}>{conflictCount === null ? "—" : conflictCount}</div>
            </div>
          </div>

          {conflictCount ? (
            <div className={cx("error-box")}>
              <strong>{conflictCount} unresolved conflicts.</strong> Copy (commit) is disabled — review
              conflicts.jsonl for this run before proceeding. Dry runs are still safe.
            </div>
          ) : null}

          <div className={cx("migration-actions")}>
            <button
              type="button"
              className={cx("action-button secondary")}
              disabled={copyingDryRun}
              onClick={() => runDryRun({ endpoint: "copy", body: { runId: activeRunId, commit: false }, setBusy: setCopyingDryRun, label: "Copy (dry run)" })}
            >
              {copyingDryRun ? "Running..." : "Copy (dry run)"}
            </button>
            <button
              type="button"
              className={cx("action-button danger")}
              disabled={Boolean(conflictCount)}
              onClick={() =>
                openCommitConfirm({
                  subcommand: "copy",
                  endpoint: "copy",
                  title: "Copy — commit",
                  params: [["Run", activeRunId], ["Scope", activeScope]],
                  extraBody: { runId: activeRunId },
                })
              }
            >
              Copy (commit)
            </button>
            <button
              type="button"
              className={cx("action-button secondary")}
              disabled={verifyingS3}
              onClick={() =>
                runDryRun({
                  endpoint: "verify-s3",
                  body: { runId: activeRunId },
                  setBusy: setVerifyingS3,
                  label: "Verify S3",
                  timeout: LONG_RUNNING_TIMEOUT_MS,
                })
              }
            >
              {verifyingS3 ? "Running..." : "Verify S3"}
            </button>
          </div>

          <div className={cx("field-row")}>
            <span>Rewrite / verify target</span>
            <select value={rewriteTarget} onChange={(event) => setRewriteTarget(event.target.value)}>
              <option value="dev">dev</option>
              <option value="prod">prod</option>
            </select>
          </div>
          {rewriteTarget === "prod" ? (
            <div className={cx("scope-note")}>
              Prod rewrite should only ever follow a soaked, verified dev rewrite — see
              S3_KEY_RESTRUCTURE_PROGRESS.md's Track B ordering. The confirm phrase escalates to
              "RUN ON PROD" for this target.
            </div>
          ) : null}

          <div className={cx("migration-actions")}>
            <button
              type="button"
              className={cx("action-button secondary")}
              disabled={rewritingDryRun}
              onClick={() =>
                runDryRun({
                  endpoint: "rewrite",
                  body: { runId: activeRunId, target: rewriteTarget, commit: false },
                  setBusy: setRewritingDryRun,
                  label: "Rewrite (dry run)",
                })
              }
            >
              {rewritingDryRun ? "Running..." : "Rewrite (dry run)"}
            </button>
            <button
              type="button"
              className={cx("action-button danger")}
              onClick={() =>
                openCommitConfirm({
                  subcommand: "rewrite",
                  endpoint: "rewrite",
                  target: rewriteTarget,
                  title: `Rewrite — commit (${rewriteTarget})`,
                  params: [["Run", activeRunId], ["Scope", activeScope], ["Target DB", rewriteTarget]],
                  extraBody: { runId: activeRunId, target: rewriteTarget },
                })
              }
            >
              Rewrite (commit)
            </button>
            <button
              type="button"
              className={cx("action-button secondary")}
              disabled={verifying}
              onClick={() =>
                runDryRun({
                  endpoint: "verify",
                  body: { runId: activeRunId, target: rewriteTarget },
                  setBusy: setVerifying,
                  label: "Verify",
                  timeout: LONG_RUNNING_TIMEOUT_MS,
                })
              }
            >
              {verifying ? "Running..." : "Verify"}
            </button>
          </div>

          {lastActionOutput ? (
            <details className={cx("scope-note")}>
              <summary>Last command output</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{lastActionOutput}</pre>
            </details>
          ) : null}
        </div>
      ) : null}

      {!job ? (
        <div className={cx("inline-note")}>
          {loading ? "Loading…" : "No copy/rewrite job has ever reported to this card yet — run a plan above, then Copy or Rewrite to start one."}
        </div>
      ) : (
        <>
          <div className={cx("migration-actions")}>
            <button type="button" className={cx("action-button secondary")} onClick={pauseRun} disabled={pausing || !pausable}>
              {pausing ? "Pausing..." : "Pause"}
            </button>
            <button type="button" className={cx("action-button danger")} onClick={cancelJobRun} disabled={cancelling || !cancellable}>
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

      {confirmModal ? (
        <TypeToConfirmModal
          title={confirmModal.title}
          params={confirmModal.params}
          phrase={confirmPhrase({ subcommand: confirmModal.subcommand, scope: confirmModal.scope, target: confirmModal.target })}
          danger
          confirmLabel="Run commit"
          busy={confirmBusy}
          onConfirm={submitConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      ) : null}
    </div>
  );
}
