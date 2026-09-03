import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  Button, CircularProgress, Typography, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import DeleteForeverRoundedIcon from "@mui/icons-material/DeleteForeverRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useSnackbar } from "shared/components/snackbar/SnackbarProvider.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import {
  fetchDuplicateRules,
  scanDuplicates,
  resolveDuplicateGroup,
  ignoreDuplicateGroup,
  restoreDuplicateGroup,
  fetchPurgeImpact,
  purgeDuplicateGroup,
} from "state/actions/businessDuplicateAction.js";
import styles from "features/admin/business-duplicates/businessDuplicates.module.css";

const cx = createScopedClassNames(styles);

/**
 * Confidence is the spine of this screen.
 *
 * The directory stores one document per category for a single business, so
 * "same name at the same address" is the NORMAL state, not a defect. Showing
 * every collision as an equal-weight "duplicate" would train an admin to merge
 * listings that are supposed to exist. Each tier therefore says plainly what it
 * is and how much trust it deserves.
 */
const CONFIDENCE = {
  certain: {
    label: "Certain",
    blurb: "Redundant listings. Safe to merge after a glance.",
    tone: "certain",
  },
  likely: {
    label: "Likely",
    blurb: "Almost certainly duplicates — read the addresses before merging.",
    tone: "likely",
  },
  review: {
    label: "Needs review",
    blurb: "A real question. Chain branches sharing a helpline live here.",
    tone: "review",
  },
  quality: {
    label: "Data quality",
    blurb: "Not duplicates — data-entry defects worth fixing at the source.",
    tone: "quality",
  },
  audit: {
    label: "Expected",
    blurb: "The intended one-listing-per-category pattern. Shown to prove the data is sane.",
    tone: "audit",
  },
};

const CONFIDENCE_ORDER = ["certain", "likely", "review", "quality", "audit"];

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const BusinessDuplicates = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [rules, setRules] = useState([]);
  const [selectedRules, setSelectedRules] = useState([]);
  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  // groupKey -> id of the row the admin wants to keep
  const [keepChoice, setKeepChoice] = useState({});
  // groupKey -> Set of ids the admin marked for removal
  const [removeChoice, setRemoveChoice] = useState({});
  const [busyGroup, setBusyGroup] = useState(null);
  const [resolved, setResolved] = useState({});
  // Hard delete is irreversible, so it goes through a confirm dialog that first
  // reports exactly what would be destroyed.
  const [purgeTarget, setPurgeTarget] = useState(null);
  const [purgeImpact, setPurgeImpact] = useState(null);
  const [purgeLoading, setPurgeLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dispatch(fetchDuplicateRules())
      .then((list) => {
        if (cancelled) return;
        setRules(list);
        setSelectedRules(list.map((rule) => rule.id));
      })
      .catch((error) => enqueueSnackbar(error.message, { variant: "error" }));
    return () => {
      cancelled = true;
    };
  }, [dispatch, enqueueSnackbar]);

  const runScan = useCallback(async () => {
    if (!selectedRules.length) {
      enqueueSnackbar("Pick at least one rule to scan with", { variant: "warning" });
      return;
    }
    setScanning(true);
    try {
      const result = await dispatch(scanDuplicates({ rules: selectedRules }));
      setScan(result);
      setResolved({});
      setExpanded(null);
      // Pre-select the engine's suggestion so the common case is one click:
      // keep the richest record, remove the rest.
      const keeps = {};
      const removes = {};
      for (const group of result.groups) {
        keeps[group.groupKey] = group.suggestedKeepId;
        removes[group.groupKey] = new Set(
          group.members
            .filter((member) => String(member._id) !== group.suggestedKeepId)
            .map((member) => String(member._id))
        );
      }
      setKeepChoice(keeps);
      setRemoveChoice(removes);
      enqueueSnackbar(
        `Scanned ${result.totalScanned.toLocaleString("en-IN")} listings — ${result.groups.length} groups flagged`,
        { variant: "success" }
      );
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setScanning(false);
    }
  }, [dispatch, selectedRules, enqueueSnackbar]);

  const toggleRule = (ruleId) =>
    setSelectedRules((current) =>
      current.includes(ruleId) ? current.filter((id) => id !== ruleId) : [...current, ruleId]
    );

  const setKeep = (groupKey, memberId) => {
    setKeepChoice((current) => ({ ...current, [groupKey]: memberId }));
    // Keeping a row implies not removing it.
    setRemoveChoice((current) => {
      const next = new Set(current[groupKey] || []);
      next.delete(memberId);
      return { ...current, [groupKey]: next };
    });
  };

  const toggleRemove = (groupKey, memberId) => {
    if (keepChoice[groupKey] === memberId) return;
    setRemoveChoice((current) => {
      const next = new Set(current[groupKey] || []);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return { ...current, [groupKey]: next };
    });
  };

  const applyMerge = async (group) => {
    const keepId = keepChoice[group.groupKey];
    const removeIds = [...(removeChoice[group.groupKey] || [])];
    if (!removeIds.length) {
      enqueueSnackbar("Nothing selected to remove", { variant: "warning" });
      return;
    }
    setBusyGroup(group.groupKey);
    try {
      const result = await dispatch(
        resolveDuplicateGroup({
          keepId,
          removeIds,
          groupKey: group.groupKey,
          ruleId: group.ruleId,
          reason: group.reason,
        })
      );
      setResolved((current) => ({
        ...current,
        [group.groupKey]: { kind: "merged", count: result.removed, memberIds: removeIds },
      }));
      enqueueSnackbar(result.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setBusyGroup(null);
    }
  };

  const openPurgeDialog = async (group) => {
    const removeIds = [...(removeChoice[group.groupKey] || [])];
    if (!removeIds.length) {
      enqueueSnackbar("Nothing selected to delete", { variant: "warning" });
      return;
    }
    setPurgeTarget({ group, removeIds });
    setPurgeImpact(null);
    setPurgeLoading(true);
    try {
      setPurgeImpact(await dispatch(fetchPurgeImpact(removeIds)));
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setPurgeLoading(false);
    }
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    const { group, removeIds } = purgeTarget;
    setBusyGroup(group.groupKey);
    try {
      const result = await dispatch(
        purgeDuplicateGroup({ keepId: keepChoice[group.groupKey], removeIds })
      );
      setResolved((current) => ({
        ...current,
        // No memberIds recorded: a purge cannot be undone, so no Undo is offered.
        [group.groupKey]: { kind: "purged", count: result.purged },
      }));
      enqueueSnackbar(result.message, { variant: "success" });
      setPurgeTarget(null);
      setPurgeImpact(null);
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setBusyGroup(null);
    }
  };

  const dismissGroup = async (group) => {
    setBusyGroup(group.groupKey);
    try {
      const memberIds = group.members.map((member) => String(member._id));
      await dispatch(
        ignoreDuplicateGroup({
          memberIds,
          groupKey: group.groupKey,
          ruleId: group.ruleId,
          reason: group.reason,
        })
      );
      setResolved((current) => ({
        ...current,
        [group.groupKey]: { kind: "ignored", count: memberIds.length, memberIds },
      }));
      enqueueSnackbar("Marked as not a duplicate", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setBusyGroup(null);
    }
  };

  const undoGroup = async (group) => {
    const record = resolved[group.groupKey];
    if (!record) return;
    setBusyGroup(group.groupKey);
    try {
      await dispatch(restoreDuplicateGroup({ memberIds: record.memberIds }));
      setResolved((current) => {
        const next = { ...current };
        delete next[group.groupKey];
        return next;
      });
      enqueueSnackbar("Listings restored to the site", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setBusyGroup(null);
    }
  };

  const visibleGroups = useMemo(() => {
    if (!scan) return [];
    const term = search.trim().toLowerCase();
    return scan.groups.filter((group) => {
      if (confidenceFilter !== "all" && group.confidence !== confidenceFilter) return false;
      if (!term) return true;
      return group.members.some(
        (member) =>
          member.businessName.toLowerCase().includes(term) ||
          member.category.toLowerCase().includes(term) ||
          member.location.toLowerCase().includes(term) ||
          member.contact.includes(term) ||
          member.publicId.toLowerCase().includes(term)
      );
    });
  }, [scan, confidenceFilter, search]);

  const tallies = useMemo(() => {
    if (!scan) return {};
    return scan.groups.reduce((acc, group) => {
      acc[group.confidence] = (acc[group.confidence] || 0) + 1;
      return acc;
    }, {});
  }, [scan]);

  const redundantTotal = useMemo(() => {
    if (!scan) return 0;
    return scan.groups.reduce((sum, group) => (group.benign ? sum : sum + group.size - 1), 0);
  }, [scan]);

  return (
    <div className={cx("page")}>
      <header className={cx("page-header")}>
        <button className={cx("back-btn")} onClick={() => navigate("/dashboard/business")}>
          <ArrowBackRoundedIcon sx={{ fontSize: "1.1rem" }} />
          <span>Business Directory</span>
        </button>
        <div className={cx("title-block")}>
          <h1 className={cx("title")}>
            <ContentCopyRoundedIcon sx={{ fontSize: "1.6rem" }} />
            Duplicate Review
          </h1>
          <p className={cx("subtitle")}>
            One business is stored once per category, so the same name at the same address is
            usually correct. Every group below says which rule flagged it and why, so you can judge
            before you act.
          </p>
        </div>
      </header>

      <section className={cx("rules-panel")}>
        <div className={cx("rules-head")}>
          <h2 className={cx("section-title")}>Detection rules</h2>
          <div className={cx("rules-actions")}>
            <button className={cx("link-btn")} onClick={() => setSelectedRules(rules.map((r) => r.id))}>
              Select all
            </button>
            <button className={cx("link-btn")} onClick={() => setSelectedRules([])}>
              Clear
            </button>
            <button className={cx("scan-btn")} onClick={runScan} disabled={scanning}>
              {scanning ? (
                <CircularProgress size={15} sx={{ color: "#fff" }} />
              ) : (
                <PlayArrowRoundedIcon sx={{ fontSize: "1.1rem" }} />
              )}
              <span>{scanning ? "Scanning…" : "Run scan"}</span>
            </button>
          </div>
        </div>

        <div className={cx("rules-grid")}>
          {rules.map((rule) => {
            const active = selectedRules.includes(rule.id);
            const hit = scan?.summary?.find((entry) => entry.id === rule.id);
            return (
              <button
                key={rule.id}
                type="button"
                className={cx("rule-card", active && "rule-card-active")}
                onClick={() => toggleRule(rule.id)}
              >
                <div className={cx("rule-top")}>
                  <span className={cx("rule-label")}>{rule.label}</span>
                  <span className={cx("tier", `tier-${CONFIDENCE[rule.confidence]?.tone}`)}>
                    {CONFIDENCE[rule.confidence]?.label}
                  </span>
                </div>
                <p className={cx("rule-blurb")}>{rule.blurb}</p>
                {hit && (
                  <div className={cx("rule-stat")}>
                    <strong>{hit.groups}</strong> groups
                    {hit.redundant > 0 && <span> · {hit.redundant} redundant</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {scan && (
        <>
          <section className={cx("summary-bar")}>
            <div className={cx("summary-stat")}>
              <span className={cx("stat-value")}>{scan.totalScanned.toLocaleString("en-IN")}</span>
              <span className={cx("stat-label")}>listings scanned</span>
            </div>
            <div className={cx("summary-stat")}>
              <span className={cx("stat-value")}>{scan.groups.length}</span>
              <span className={cx("stat-label")}>groups flagged</span>
            </div>
            <div className={cx("summary-stat")}>
              <span className={cx("stat-value")}>{redundantTotal}</span>
              <span className={cx("stat-label")}>redundant listings</span>
            </div>
            <div className={cx("summary-spacer")} />
            <input
              className={cx("search-input")}
              placeholder="Filter by name, category, phone, publicId…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </section>

          <div className={cx("tier-filters")}>
            <button
              className={cx("tier-filter", confidenceFilter === "all" && "tier-filter-active")}
              onClick={() => setConfidenceFilter("all")}
            >
              All <span className={cx("tier-count")}>{scan.groups.length}</span>
            </button>
            {CONFIDENCE_ORDER.filter((tier) => tallies[tier]).map((tier) => (
              <button
                key={tier}
                className={cx(
                  "tier-filter",
                  `tier-filter-${CONFIDENCE[tier].tone}`,
                  confidenceFilter === tier && "tier-filter-active"
                )}
                onClick={() => setConfidenceFilter(tier)}
              >
                {CONFIDENCE[tier].label} <span className={cx("tier-count")}>{tallies[tier]}</span>
              </button>
            ))}
          </div>

          {confidenceFilter !== "all" && (
            <p className={cx("tier-explainer")}>{CONFIDENCE[confidenceFilter].blurb}</p>
          )}

          <section className={cx("groups")}>
            {visibleGroups.length === 0 && (
              <div className={cx("empty")}>Nothing matches the current filter.</div>
            )}

            {visibleGroups.map((group) => {
              const isOpen = expanded === group.groupKey;
              const record = resolved[group.groupKey];
              const removing = removeChoice[group.groupKey] || new Set();
              const busy = busyGroup === group.groupKey;

              return (
                <article
                  key={group.groupKey}
                  className={cx("group", `group-${CONFIDENCE[group.confidence]?.tone}`, record && "group-done")}
                >
                  <button
                    type="button"
                    className={cx("group-head")}
                    onClick={() => setExpanded(isOpen ? null : group.groupKey)}
                  >
                    <div className={cx("group-head-main")}>
                      <div className={cx("group-title-row")}>
                        <span className={cx("tier", `tier-${CONFIDENCE[group.confidence]?.tone}`)}>
                          {CONFIDENCE[group.confidence]?.label}
                        </span>
                        <span className={cx("group-name")}>{group.members[0].businessName.trim()}</span>
                        <span className={cx("group-size")}>{group.size} listings</span>
                      </div>
                      <p className={cx("group-reason")}>
                        <strong>{group.ruleLabel}:</strong> {group.reason}
                      </p>
                    </div>
                    {record ? (
                      <span className={cx("done-pill")}>
                        {record.kind === "merged"
                          ? `${record.count} disabled`
                          : record.kind === "purged"
                            ? `${record.count} deleted`
                            : "Dismissed"}
                      </span>
                    ) : (
                      <span className={cx("chevron", isOpen && "chevron-open")}>▾</span>
                    )}
                  </button>

                  {isOpen && (
                    <div className={cx("group-body")}>
                      <div className={cx("member-list")}>
                        {group.members.map((member) => {
                          const id = String(member._id);
                          const isKeep = keepChoice[group.groupKey] === id;
                          const isRemove = removing.has(id);
                          return (
                            <div
                              key={id}
                              className={cx(
                                "member",
                                isKeep && "member-keep",
                                isRemove && "member-remove"
                              )}
                            >
                              <div className={cx("member-decision")}>
                                <button
                                  type="button"
                                  className={cx("decide-btn", isKeep && "decide-btn-keep")}
                                  onClick={() => setKeep(group.groupKey, id)}
                                  disabled={Boolean(record)}
                                >
                                  Keep
                                </button>
                                <button
                                  type="button"
                                  className={cx("decide-btn", isRemove && "decide-btn-remove")}
                                  onClick={() => toggleRemove(group.groupKey, id)}
                                  disabled={Boolean(record) || isKeep}
                                >
                                  Remove
                                </button>
                              </div>

                              <div className={cx("member-main")}>
                                <div className={cx("member-name-row")}>
                                  <span className={cx("member-name")}>{member.businessName.trim()}</span>
                                  {member.isVerified && (
                                    <Tooltip title="Admin verified">
                                      <VerifiedRoundedIcon
                                        sx={{ fontSize: "0.95rem", color: "#2e7d32" }}
                                      />
                                    </Tooltip>
                                  )}
                                  {!member.businessesLive && (
                                    <span className={cx("offline-pill")}>Not live</span>
                                  )}
                                  <a
                                    className={cx("member-link")}
                                    href={`/dashboard/business?focus=${member.publicId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {member.publicId}
                                    <OpenInNewRoundedIcon sx={{ fontSize: "0.8rem" }} />
                                  </a>
                                </div>
                                <div className={cx("member-address")}>{member.address || "No address"}</div>
                                <div className={cx("member-meta")}>
                                  <span>{member.category || "—"}</span>
                                  <span>{member.location || "—"}</span>
                                  <span>{member.contact || "no phone"}</span>
                                  <span>added {formatDate(member.createdAt)}</span>
                                </div>
                                {member.evidence.length > 0 && (
                                  <div className={cx("evidence")}>
                                    {member.evidence.map((item) => (
                                      <span key={item} className={cx("evidence-chip")}>
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className={cx("member-score")}>
                                <span className={cx("score-value")}>{member.keepScore}</span>
                                <span className={cx("score-label")}>richness</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className={cx("group-actions")}>
                        <p className={cx("action-note")}>
                          <strong>Disable</strong> takes the listing off the site but keeps the
                          document, its reviews, analytics and QR codes — reversible.{" "}
                          <strong>Delete</strong> erases the documents and their owned content from
                          the database — permanent.
                        </p>
                        <div className={cx("action-buttons")}>
                          {record ? (
                            record.kind === "purged" ? (
                              <span className={cx("purged-note")}>
                                Permanently deleted — cannot be undone
                              </span>
                            ) : (
                              <button
                                className={cx("action-btn", "action-undo")}
                                onClick={() => undoGroup(group)}
                                disabled={busy}
                              >
                                <RestartAltRoundedIcon sx={{ fontSize: "1rem" }} />
                                <span>Undo</span>
                              </button>
                            )
                          ) : (
                            <>
                              <button
                                className={cx("action-btn", "action-dismiss")}
                                onClick={() => dismissGroup(group)}
                                disabled={busy}
                              >
                                <BlockRoundedIcon sx={{ fontSize: "1rem" }} />
                                <span>Not a duplicate</span>
                              </button>
                              <Tooltip title="Clears the live flags so the listing leaves the site. Document, reviews, analytics and QR codes are kept — this can be undone.">
                                <span>
                                  <button
                                    className={cx("action-btn", "action-apply")}
                                    onClick={() => applyMerge(group)}
                                    disabled={busy || removing.size === 0}
                                  >
                                    {busy ? (
                                      <CircularProgress size={14} sx={{ color: "#fff" }} />
                                    ) : (
                                      <VisibilityOffRoundedIcon sx={{ fontSize: "1rem" }} />
                                    )}
                                    <span>Disable {removing.size}</span>
                                  </button>
                                </span>
                              </Tooltip>
                              <Tooltip title="Erases the documents and their reviews, favourites and feed content from the database. This cannot be undone.">
                                <span>
                                  <button
                                    className={cx("action-btn", "action-purge")}
                                    onClick={() => openPurgeDialog(group)}
                                    disabled={busy || removing.size === 0}
                                  >
                                    <DeleteForeverRoundedIcon sx={{ fontSize: "1rem" }} />
                                    <span>Delete {removing.size}</span>
                                  </button>
                                </span>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}

      <Dialog
        open={Boolean(purgeTarget)}
        onClose={() => { setPurgeTarget(null); setPurgeImpact(null); }}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle className={cx("purge-title")}>
          <WarningAmberRoundedIcon sx={{ color: "#b3261e" }} />
          Permanently delete {purgeTarget?.removeIds.length} listing
          {purgeTarget?.removeIds.length === 1 ? "" : "s"}?
        </DialogTitle>
        <DialogContent>
          <p className={cx("purge-lead")}>
            This erases the documents from the database. It cannot be undone — use{" "}
            <strong>Disable</strong> instead if you might want them back.
          </p>

          {purgeLoading && (
            <div className={cx("purge-loading")}>
              <CircularProgress size={18} />
              <span>Checking what this would affect…</span>
            </div>
          )}

          {purgeImpact && (
            <div className={cx("impact")}>
              <div className={cx("impact-block", "impact-delete")}>
                <span className={cx("impact-head")}>Will be deleted</span>
                <ul className={cx("impact-list")}>
                  <li>{purgeImpact.listings} business listing(s)</li>
                  <li>{purgeImpact.deletes.reviews} review(s)</li>
                  <li>{purgeImpact.deletes.favorites} saved favourite(s)</li>
                  <li>{purgeImpact.deletes.feedPosts} feed post(s)</li>
                  <li>{purgeImpact.deletes.feedFollows} feed follower(s)</li>
                </ul>
              </div>
              <div className={cx("impact-block", "impact-detach")}>
                <span className={cx("impact-head")}>Will be detached</span>
                <ul className={cx("impact-list")}>
                  <li>{purgeImpact.detaches.advertisements} advertisement(s)</li>
                  <li>{purgeImpact.detaches.leadDispatches} queued lead dispatch(es)</li>
                </ul>
              </div>
              <div className={cx("impact-block", "impact-keep")}>
                <span className={cx("impact-head")}>Kept (financial & audit history)</span>
                <ul className={cx("impact-list")}>
                  <li>{purgeImpact.preserves.payments} payment record(s)</li>
                  <li>{purgeImpact.preserves.rewardClaims} reward claim(s)</li>
                </ul>
              </div>
              <p className={cx("impact-foot")}>
                Uploaded files in S3 (banner, gallery, KYC, QR, certificates) are left in place.
              </p>
            </div>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: "12px 22px 18px" }}>
          <button
            className={cx("action-btn", "action-dismiss")}
            onClick={() => { setPurgeTarget(null); setPurgeImpact(null); }}
          >
            Cancel
          </button>
          <button
            className={cx("action-btn", "action-purge")}
            onClick={confirmPurge}
            disabled={purgeLoading || Boolean(busyGroup)}
          >
            {busyGroup ? (
              <CircularProgress size={14} sx={{ color: "#fff" }} />
            ) : (
              <DeleteForeverRoundedIcon sx={{ fontSize: "1rem" }} />
            )}
            <span>Delete permanently</span>
          </button>
        </DialogActions>
      </Dialog>

      {!scan && !scanning && (
        <div className={cx("intro")}>
          <Typography className={cx("intro-title")}>No scan run yet</Typography>
          <Typography className={cx("intro-text")}>
            Pick the rules you want and run a scan. Nothing is changed until you act on a group.
          </Typography>
          <Button className={cx("intro-btn")} onClick={runScan} variant="contained">
            Run scan with all rules
          </Button>
        </div>
      )}

      {scanning && !scan && (
        <div className={cx("intro")}>
          <CircularProgress size={26} />
          <Typography className={cx("intro-text")}>
            Comparing every listing against every selected rule…
          </Typography>
        </div>
      )}
    </div>
  );
};

export default BusinessDuplicates;
