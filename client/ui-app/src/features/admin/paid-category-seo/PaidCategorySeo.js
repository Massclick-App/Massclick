import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useSnackbar } from "notistack";
import { Dialog, DialogContent, DialogTitle, IconButton, CircularProgress, Tooltip } from "@mui/material";
import { BadgeCheck, AlertTriangle, ShieldAlert, RefreshCw, X, ExternalLink, Pencil, Plus, Search } from "lucide-react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { namesBusiness } from "shared/utils/businessSeoMeta.js";
import {
  getPaidSeoOverview,
  getPaidSeoCategory,
  getPaidSeoGaps,
  getPaidSeoConflicts,
  savePaidSeoRow,
  savePaidBusinessSeo,
  saveProtectedTerms,
  fixPaidSeoConflict,
  refreshPaidSeoCache,
} from "state/actions/paidCategorySeoAction.js";
import styles from "features/admin/paid-category-seo/paidCategorySeo.module.css";

const cx = createScopedClassNames(styles);

// Same ranges the server grades against (paidSeoConsoleHelper.js).
const TITLE_RANGE = [30, 70];
const DESCRIPTION_RANGE = [70, 170];

const TABS = [
  { id: "categories", label: "Paid categories", icon: BadgeCheck },
  { id: "gaps", label: "Gaps", icon: AlertTriangle },
  { id: "competitors", label: "Competitors", icon: ShieldAlert },
];

const CHECK_LABELS = {
  hasRow: "Dedicated SEO",
  titleLength: "Title length",
  descriptionLength: "Description length",
  mentionsPaidBusiness: "Names paid business",
  hasPageContent: "Page content",
  featuresPaidBusinesses: "Verified box",
};

const coverageTone = (value) => (value === null ? "neutral" : value >= 90 ? "green" : value >= 60 ? "amber" : "red");
const lengthTone = (len, [min, max]) => (len >= min && len <= max ? "green" : len === 0 ? "neutral" : "amber");

const Counter = ({ value, range }) => (
  <span className={cx("paid-seo-counter", `paid-seo-counter-${lengthTone(value.length, range)}`)}>
    {value.length} / {range[0]}–{range[1]}
  </span>
);

const Kpi = ({ label, value, tone = "neutral", hint }) => (
  <div className={cx("paid-seo-kpi")}>
    <span className={cx("paid-seo-kpi-label")}>{label}</span>
    <span className={cx("paid-seo-kpi-value", `paid-seo-tone-${tone}`)}>{value}</span>
    {hint && <span className={cx("paid-seo-kpi-hint")}>{hint}</span>}
  </div>
);

const CoverageBar = ({ value }) => (
  value === null
    ? <span className={cx("paid-seo-muted")}>No category page</span>
    : (
      <div className={cx("paid-seo-coverage")}>
        <div className={cx("paid-seo-coverage-track")}>
          <div className={cx("paid-seo-coverage-fill", `paid-seo-fill-${coverageTone(value)}`)} style={{ width: `${value}%` }} />
        </div>
        <span className={cx("paid-seo-coverage-value")}>{value}%</span>
      </div>
    )
);

// ---------------------------------------------------------------------------
// Editors
// ---------------------------------------------------------------------------

const SeoRowEditor = ({ target, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState(target.initial.title || "");
  const [description, setDescription] = useState(target.initial.description || "");
  const [keywords, setKeywords] = useState(target.initial.keywords || "");
  const [saving, setSaving] = useState(false);

  const namesPaid = target.businesses.some((b) =>
    namesBusiness(`${title} ${description}`, { businessName: b.name, category: target.categoryName }));

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(savePaidSeoRow({
        category: target.categorySlug,
        district: target.districtSlug,
        locationSlug: target.locationSlug || "",
        title,
        description,
        keywords,
      }));
      enqueueSnackbar("SEO saved and live cache refreshed", { variant: "success" });
      onSaved();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={cx("paid-seo-dialog-title")}>
        <span>{target.exists ? "Edit" : "Create"} SEO — {target.categoryName} in {target.place}</span>
        <IconButton onClick={onClose} size="small" aria-label="Close"><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent>
        <div className={cx("paid-seo-form")}>
          <p className={cx("paid-seo-muted")}>
            Page: <a href={target.pageUrl} target="_blank" rel="noopener noreferrer" className={cx("paid-seo-link")}>{target.pageUrl}</a>
            {" · "}Paid: {target.businesses.map((b) => b.name).join(", ")}
          </p>
          <label className={cx("paid-seo-field")}>
            <span className={cx("paid-seo-field-head")}>Title <Counter value={title} range={TITLE_RANGE} /></span>
            <input className={cx("paid-seo-input")} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className={cx("paid-seo-field")}>
            <span className={cx("paid-seo-field-head")}>Description <Counter value={description} range={DESCRIPTION_RANGE} /></span>
            <textarea className={cx("paid-seo-textarea")} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className={cx("paid-seo-field")}>
            <span className={cx("paid-seo-field-head")}>Keywords <span className={cx("paid-seo-muted")}>comma separated</span></span>
            <textarea className={cx("paid-seo-textarea")} rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </label>
          <div className={cx("paid-seo-preview")}>
            <span className={cx("paid-seo-preview-url")}>massclick.in{target.pageUrl}</span>
            <span className={cx("paid-seo-preview-title")}>{title || "Title"}</span>
            <span className={cx("paid-seo-preview-desc")}>{description || "Description"}</span>
          </div>
          <span className={cx("paid-seo-chip", namesPaid ? "paid-seo-chip-green" : "paid-seo-chip-amber")}>
            {namesPaid ? "Names a paid business" : "Doesn't name a paid business yet"}
          </span>
          <div className={cx("paid-seo-actions")}>
            <button type="button" className={cx("paid-seo-button")} onClick={onClose}>Cancel</button>
            <button type="button" className={cx("paid-seo-button paid-seo-button-primary")} disabled={saving || !title.trim() || !description.trim()} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BusinessSeoEditor = ({ business, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [seoTitle, setSeoTitle] = useState(business.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(business.seoDescription || "");
  const [saving, setSaving] = useState(false);
  const probe = { businessName: business.name, category: business.category };
  const titleOk = namesBusiness(seoTitle, probe);
  const descOk = namesBusiness(seoDescription, probe);

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(savePaidBusinessSeo(business.id, { seoTitle, seoDescription }));
      enqueueSnackbar("Business SEO saved", { variant: "success" });
      onSaved();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={cx("paid-seo-dialog-title")}>
        <span>Business page SEO — {business.name}</span>
        <IconButton onClick={onClose} size="small" aria-label="Close"><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent>
        <div className={cx("paid-seo-form")}>
          <p className={cx("paid-seo-muted")}>
            Used on the business page only when it names the business; otherwise the page builds
            “{business.name} – category in area”.
          </p>
          <label className={cx("paid-seo-field")}>
            <span className={cx("paid-seo-field-head")}>
              SEO title <Counter value={seoTitle} range={TITLE_RANGE} />
              <span className={cx("paid-seo-chip", titleOk ? "paid-seo-chip-green" : "paid-seo-chip-red")}>{titleOk ? "Will be used" : "Ignored – doesn't name the business"}</span>
            </span>
            <input className={cx("paid-seo-input")} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </label>
          <label className={cx("paid-seo-field")}>
            <span className={cx("paid-seo-field-head")}>
              SEO description <Counter value={seoDescription} range={DESCRIPTION_RANGE} />
              <span className={cx("paid-seo-chip", descOk ? "paid-seo-chip-green" : "paid-seo-chip-red")}>{descOk ? "Will be used" : "Ignored – doesn't name the business"}</span>
            </span>
            <textarea className={cx("paid-seo-textarea")} rows={3} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
          </label>
          <div className={cx("paid-seo-actions")}>
            <button type="button" className={cx("paid-seo-button")} onClick={onClose}>Cancel</button>
            <button type="button" className={cx("paid-seo-button paid-seo-button-primary")} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ConflictTextEditor = ({ conflict, onClose, onSaved }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [value, setValue] = useState(conflict.text || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await dispatch(fixPaidSeoConflict({ source: conflict.source, docId: conflict.docId, field: conflict.field, value }));
      enqueueSnackbar("Competitor SEO updated", { variant: "success" });
      onSaved();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle className={cx("paid-seo-dialog-title")}>
        <span>Edit {conflict.competitor} {conflict.source === "template" ? "template" : `(${conflict.district})`} — {conflict.field}</span>
        <IconButton onClick={onClose} size="small" aria-label="Close"><X size={18} /></IconButton>
      </DialogTitle>
      <DialogContent>
        <div className={cx("paid-seo-form")}>
          <p className={cx("paid-seo-muted")}>Remove “{conflict.term}” — it belongs to the paid category {conflict.paidCategoryName}.</p>
          <textarea className={cx("paid-seo-textarea")} rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
          <div className={cx("paid-seo-actions")}>
            <button type="button" className={cx("paid-seo-button")} onClick={onClose}>Cancel</button>
            <button type="button" className={cx("paid-seo-button paid-seo-button-primary")} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Shared lists
// ---------------------------------------------------------------------------

const ConflictList = ({ conflicts, onChanged, showOwner = true }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState("");

  const removeItems = async (conflict) => {
    if (!window.confirm(`Remove ${conflict.items.length} keyword(s) from ${conflict.competitor}?\n\n${conflict.items.join("\n")}`)) return;
    setBusyId(conflict.id);
    try {
      await dispatch(fixPaidSeoConflict({ source: conflict.source, docId: conflict.docId, field: conflict.field, removeItems: conflict.items }));
      enqueueSnackbar("Keywords removed", { variant: "success" });
      onChanged();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setBusyId("");
    }
  };

  if (!conflicts.length) return <p className={cx("paid-seo-empty")}>No other category is using these paid categories’ search terms.</p>;

  return (
    <>
      <div className={cx("paid-seo-table-wrap")}>
        <table className={cx("paid-seo-table")}>
          <thead>
            <tr>
              {showOwner && <th>Paid category</th>}
              <th>Competitor</th>
              <th>Where</th>
              <th>Uses</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {conflicts.map((c) => (
              <tr key={c.id}>
                {showOwner && <td className={cx("paid-seo-strong")}>{c.paidCategoryName}</td>}
                <td>{c.competitor}</td>
                <td>{c.source === "template" ? "Template" : c.district} · {c.field.replace("Template", "")}</td>
                <td>
                  <span className={cx("paid-seo-chip paid-seo-chip-amber")}>{c.term}</span>
                  <span className={cx("paid-seo-conflict-text")}>{c.items ? c.items.join(" · ") : c.text}</span>
                </td>
                <td className={cx("paid-seo-cell-actions")}>
                  {c.items ? (
                    <button type="button" className={cx("paid-seo-button paid-seo-button-small")} disabled={busyId === c.id} onClick={() => removeItems(c)}>
                      {busyId === c.id ? "Removing…" : "Remove keywords"}
                    </button>
                  ) : (
                    <button type="button" className={cx("paid-seo-button paid-seo-button-small")} onClick={() => setEditing(c)}>
                      <Pencil size={13} /> Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <ConflictTextEditor conflict={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
    </>
  );
};

const SlotChecks = ({ checks }) => (
  <div className={cx("paid-seo-checks")}>
    {Object.entries(checks).map(([key, ok]) => (
      <span key={key} className={cx("paid-seo-chip", ok ? "paid-seo-chip-green" : "paid-seo-chip-red")}>
        {ok ? "✓" : "✗"} {CHECK_LABELS[key] || key}
      </span>
    ))}
  </div>
);

const rowEditTarget = (slot, categorySlug, categoryName) => ({
  categorySlug,
  categoryName,
  districtSlug: slot.districtSlug,
  locationSlug: slot.locationSlug,
  place: slot.place,
  pageUrl: slot.pageUrl,
  businesses: slot.businesses,
  exists: Boolean(slot.row?.active),
  initial: slot.row?.active ? slot.row : slot.suggested,
});

// ---------------------------------------------------------------------------
// Category detail
// ---------------------------------------------------------------------------

const TermsEditor = ({ category, onSaved }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [terms, setTerms] = useState(category.customTerms || []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(terms) !== JSON.stringify(category.customTerms || []);

  const add = () => {
    const value = draft.trim().toLowerCase();
    if (value.length >= 3 && !terms.includes(value)) setTerms([...terms, value]);
    setDraft("");
  };
  const save = async () => {
    setSaving(true);
    try {
      await dispatch(saveProtectedTerms(category.slug, terms));
      enqueueSnackbar("Protected terms saved", { variant: "success" });
      onSaved();
    } catch (error) {
      enqueueSnackbar(error.message, { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cx("paid-seo-terms")}>
      <p className={cx("paid-seo-muted")}>
        Automatic terms only flag competitors whose keyword or title is purely this search (“{category.autoTerms[0]} in trichy”).
        Terms you add flag any use (e.g. “toys” on a fancy shop).
      </p>
      <div className={cx("paid-seo-checks")}>
        {category.autoTerms.map((t) => <span key={t} className={cx("paid-seo-chip paid-seo-chip-neutral")}>{t} · auto</span>)}
        {terms.map((t) => (
          <span key={t} className={cx("paid-seo-chip paid-seo-chip-blue")}>
            {t}
            <button type="button" className={cx("paid-seo-chip-remove")} aria-label={`Remove ${t}`} onClick={() => setTerms(terms.filter((x) => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <div className={cx("paid-seo-inline-form")}>
        <input className={cx("paid-seo-input paid-seo-input-term")} placeholder="Add a term, e.g. toys" value={draft}
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <button type="button" className={cx("paid-seo-button")} onClick={add}><Plus size={14} /> Add</button>
        <button type="button" className={cx("paid-seo-button paid-seo-button-primary")} disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save terms"}</button>
      </div>
    </div>
  );
};

const CategoryDetail = ({ slug, onClose, onChanged }) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [rowTarget, setRowTarget] = useState(null);
  const [businessTarget, setBusinessTarget] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setError("");
    dispatch(getPaidSeoCategory(slug)).then(setData).catch((e) => setError(e.message));
  }, [dispatch, slug]);

  useEffect(() => { load(); }, [load]);

  const changed = () => { load(); onChanged(); };

  const refreshCache = async () => {
    setRefreshing(true);
    try {
      await dispatch(refreshPaidSeoCache(slug));
      enqueueSnackbar("Live pages will show the latest SEO on next load", { variant: "success" });
    } catch (e) {
      enqueueSnackbar(e.message, { variant: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle className={cx("paid-seo-dialog-title")}>
        <span>{data?.category.name || slug}</span>
        <span className={cx("paid-seo-dialog-tools")}>
          <button type="button" className={cx("paid-seo-button")} disabled={refreshing} onClick={refreshCache}>
            <RefreshCw size={14} /> {refreshing ? "Refreshing…" : "Refresh live pages"}
          </button>
          <IconButton onClick={onClose} size="small" aria-label="Close"><X size={18} /></IconButton>
        </span>
      </DialogTitle>
      <DialogContent>
        {error && <p className={cx("paid-seo-error")}>{error}</p>}
        {!data && !error && <div className={cx("paid-seo-loading")}><CircularProgress size={24} /></div>}
        {data && (
          <div className={cx("paid-seo-detail")}>
            <div className={cx("paid-seo-kpis")}>
              <Kpi label="Coverage" value={data.summary.coverage === null ? "—" : `${data.summary.coverage}%`} tone={coverageTone(data.summary.coverage)} />
              <Kpi label="Paid businesses" value={data.businesses.length} />
              <Kpi label="Pages" value={data.slots.length} hint={`${data.summary.gapCount} with gaps`} tone={data.summary.gapCount ? "amber" : "green"} />
              <Kpi label="Conflicts" value={data.conflicts.length} tone={data.conflicts.length ? "amber" : "green"} />
            </div>

            <section className={cx("paid-seo-section")}>
              <h3 className={cx("paid-seo-section-title")}>Pages</h3>
              {!data.slots.length && <p className={cx("paid-seo-empty")}>No public category page — the paid business’s district isn’t on the site.</p>}
              {data.slots.map((slot) => (
                <div key={slot.key} className={cx("paid-seo-slot", slot.issues.length ? "paid-seo-slot-warn" : "")}>
                  <div className={cx("paid-seo-slot-head")}>
                    <span className={cx("paid-seo-chip", slot.type === "district" ? "paid-seo-chip-blue" : "paid-seo-chip-neutral")}>{slot.type === "district" ? "District page" : "Locality page"}</span>
                    <span className={cx("paid-seo-strong")}>{slot.place}</span>
                    <a href={slot.pageUrl} target="_blank" rel="noopener noreferrer" className={cx("paid-seo-link")}>{slot.pageUrl} <ExternalLink size={12} /></a>
                    <span className={cx("paid-seo-spacer")} />
                    <button type="button" className={cx("paid-seo-button paid-seo-button-small")} onClick={() => setRowTarget(rowEditTarget(slot, data.category.slug, data.category.name))}>
                      {slot.row?.active ? <><Pencil size={13} /> Edit SEO</> : <><Plus size={13} /> Create SEO</>}
                    </button>
                  </div>
                  {slot.row?.active ? (
                    <div className={cx("paid-seo-snippet")}>
                      <span className={cx("paid-seo-snippet-title")}>{slot.row.title}</span>
                      <span className={cx("paid-seo-snippet-desc")}>{slot.row.description}</span>
                    </div>
                  ) : <p className={cx("paid-seo-muted")}>Using a template / auto-generated title.</p>}
                  <SlotChecks checks={slot.checks} />
                  {slot.issues.length > 0 && <ul className={cx("paid-seo-issues")}>{slot.issues.map((i) => <li key={i.code}>{i.label}</li>)}</ul>}
                  <p className={cx("paid-seo-muted")}>Paid here: {slot.businesses.map((b) => b.name).join(", ")}</p>
                </div>
              ))}
            </section>

            <section className={cx("paid-seo-section")}>
              <h3 className={cx("paid-seo-section-title")}>Paid businesses</h3>
              <div className={cx("paid-seo-table-wrap")}>
                <table className={cx("paid-seo-table")}>
                  <thead><tr><th>Business</th><th>Area</th><th>Paid via</th><th>Business page SEO</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {data.businesses.map((b) => (
                      <tr key={b.id}>
                        <td className={cx("paid-seo-strong")}>
                          {b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer" className={cx("paid-seo-link")}>{b.name}</a> : b.name}
                        </td>
                        <td>{[b.localityName, b.districtLabel].filter(Boolean).join(", ")}</td>
                        <td><span className={cx("paid-seo-muted")}>{b.signals.join(", ")}</span></td>
                        <td>
                          <span className={cx("paid-seo-chip", b.seoTitleNamesBusiness && b.seoDescriptionNamesBusiness ? "paid-seo-chip-green" : "paid-seo-chip-red")}>
                            {b.seoTitleNamesBusiness && b.seoDescriptionNamesBusiness ? "Custom SEO in use" : "Auto title – custom SEO ignored"}
                          </span>
                          <span className={cx("paid-seo-conflict-text")}>{b.seoTitle || "—"}</span>
                        </td>
                        <td className={cx("paid-seo-cell-actions")}>
                          <button type="button" className={cx("paid-seo-button paid-seo-button-small")} onClick={() => setBusinessTarget(b)}><Pencil size={13} /> Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={cx("paid-seo-section")}>
              <h3 className={cx("paid-seo-section-title")}>Protected search terms</h3>
              <TermsEditor category={data.category} onSaved={changed} />
            </section>

            <section className={cx("paid-seo-section")}>
              <h3 className={cx("paid-seo-section-title")}>Competitors using these terms</h3>
              <ConflictList conflicts={data.conflicts} onChanged={changed} showOwner={false} />
            </section>
          </div>
        )}
        {rowTarget && <SeoRowEditor target={rowTarget} onClose={() => setRowTarget(null)} onSaved={() => { setRowTarget(null); changed(); }} />}
        {businessTarget && <BusinessSeoEditor business={businessTarget} onClose={() => setBusinessTarget(null)} onSaved={() => { setBusinessTarget(null); changed(); }} />}
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PaidCategorySeo = () => {
  const dispatch = useDispatch();
  const [tab, setTab] = useState("categories");
  const [overview, setOverview] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [conflicts, setConflicts] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSlug, setOpenSlug] = useState("");
  const [gapTarget, setGapTarget] = useState(null);
  const [search, setSearch] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [o, g, c] = await Promise.all([
        dispatch(getPaidSeoOverview()),
        dispatch(getPaidSeoGaps()),
        dispatch(getPaidSeoConflicts()),
      ]);
      setOverview(o);
      setGaps(g.data || []);
      setConflicts(c.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = overview?.categories || [];
    if (!term) return list;
    return list.filter((c) => c.name.toLowerCase().includes(term) || c.businesses.some((b) => b.toLowerCase().includes(term)));
  }, [overview, search]);

  const s = overview?.summary;
  const counts = { categories: s?.categories, gaps: gaps?.length, competitors: conflicts?.length };

  return (
    <div className={cx("paid-seo-page")}>
      <div className={cx("paid-seo-header")}>
        <div>
          <h1 className={cx("paid-seo-page-title")}>Paid Category SEO</h1>
          <p className={cx("paid-seo-page-subtitle")}>
            Categories with paying businesses: keep every page they appear on complete and specific,
            and stop other categories from targeting the same searches.
          </p>
        </div>
        <button type="button" className={cx("paid-seo-button")} disabled={loading} onClick={loadAll}>
          <RefreshCw size={14} /> {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      {error && <p className={cx("paid-seo-error")}>{error}</p>}

      {s && (
        <div className={cx("paid-seo-kpis")}>
          <Kpi label="Paid categories" value={s.categories} />
          <Kpi label="Paid businesses" value={s.paidBusinesses} />
          <Kpi label="Pages complete" value={`${s.pagesComplete} / ${s.pages}`} tone={s.pagesComplete === s.pages ? "green" : "amber"} />
          <Kpi label="Average coverage" value={`${s.coverage}%`} tone={coverageTone(s.coverage)} />
          <Kpi label="Conflicts" value={s.conflicts} tone={s.conflicts ? "amber" : "green"} />
          <Kpi label="Business SEO ignored" value={s.businessSeoIssues} tone={s.businessSeoIssues ? "amber" : "green"} hint="custom SEO that doesn't name the business" />
        </div>
      )}

      <div className={cx("paid-seo-card")}>
        <div className={cx("paid-seo-tabs")} role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id}
              className={cx("paid-seo-tab", tab === id ? "paid-seo-tab-active" : "")} onClick={() => setTab(id)}>
              <Icon size={15} /> {label}
              {counts[id] !== undefined && <span className={cx("paid-seo-tab-count")}>{counts[id]}</span>}
            </button>
          ))}
        </div>

        <div className={cx("paid-seo-card-body")}>
          {loading && !overview && <div className={cx("paid-seo-loading")}><CircularProgress size={24} /></div>}

          {tab === "categories" && overview && (
            <>
              <div className={cx("paid-seo-search")}>
                <Search size={15} />
                <input className={cx("paid-seo-search-input")} placeholder="Search category or business" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className={cx("paid-seo-table-wrap")}>
                <table className={cx("paid-seo-table")}>
                  <thead>
                    <tr><th>Category</th><th>Paid businesses</th><th>Districts</th><th>Coverage</th><th>Gaps</th><th>Conflicts</th><th aria-label="Actions" /></tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((c) => (
                      <tr key={c.slug} className={cx("paid-seo-row-click")} onClick={() => setOpenSlug(c.slug)}>
                        <td className={cx("paid-seo-strong")}>{c.name}</td>
                        <td>
                          <Tooltip title={c.businesses.join(", ")}><span>{c.paidCount}</span></Tooltip>
                          <span className={cx("paid-seo-conflict-text")}>{c.businesses.slice(0, 2).join(", ")}{c.businesses.length > 2 ? "…" : ""}</span>
                        </td>
                        <td>{c.districts.join(", ") || "—"}</td>
                        <td><CoverageBar value={c.coverage} /></td>
                        <td><span className={cx("paid-seo-chip", c.gapCount ? "paid-seo-chip-amber" : "paid-seo-chip-green")}>{c.gapCount}</span></td>
                        <td><span className={cx("paid-seo-chip", c.conflictCount ? "paid-seo-chip-amber" : "paid-seo-chip-green")}>{c.conflictCount}</span></td>
                        <td className={cx("paid-seo-cell-actions")}><button type="button" className={cx("paid-seo-button paid-seo-button-small")}>Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "gaps" && gaps && (
            gaps.length ? (
              <div className={cx("paid-seo-table-wrap")}>
                <table className={cx("paid-seo-table")}>
                  <thead><tr><th>Category</th><th>Page</th><th>What’s missing</th><th aria-label="Actions" /></tr></thead>
                  <tbody>
                    {gaps.map((g) => (
                      <tr key={`${g.categorySlug}|${g.key}`}>
                        <td className={cx("paid-seo-strong")}>{g.categoryName}</td>
                        <td>
                          {g.place}
                          <a href={g.pageUrl} target="_blank" rel="noopener noreferrer" className={cx("paid-seo-link paid-seo-conflict-text")}>{g.pageUrl}</a>
                        </td>
                        <td><ul className={cx("paid-seo-issues")}>{g.issues.map((i) => <li key={i.code}>{i.label}</li>)}</ul></td>
                        <td className={cx("paid-seo-cell-actions")}>
                          {g.issues.some((i) => ["missing-row", "title-length", "description-length", "no-paid-mention"].includes(i.code)) ? (
                            <button type="button" className={cx("paid-seo-button paid-seo-button-small")} onClick={() => setGapTarget(rowEditTarget(g, g.categorySlug, g.categoryName))}>Fix SEO</button>
                          ) : (
                            <button type="button" className={cx("paid-seo-button paid-seo-button-small")} onClick={() => setOpenSlug(g.categorySlug)}>Open</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className={cx("paid-seo-empty")}>Every paid category page is complete.</p>
          )}

          {tab === "competitors" && conflicts && <ConflictList conflicts={conflicts} onChanged={loadAll} />}
        </div>
      </div>

      {openSlug && <CategoryDetail slug={openSlug} onClose={() => setOpenSlug("")} onChanged={loadAll} />}
      {gapTarget && <SeoRowEditor target={gapTarget} onClose={() => setGapTarget(null)} onSaved={() => { setGapTarget(null); loadAll(); }} />}
    </div>
  );
};

export default PaidCategorySeo;
