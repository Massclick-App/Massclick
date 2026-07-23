import React, { useEffect, useMemo, useState } from "react";
import { Paper, TextField, Button, Chip } from "@mui/material";
import QRCode from "qrcode";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import styles from "./CampaignLinkBuilder.module.css";

const SITE_ORIGIN = "https://massclick.in";

// Quick-fill chips for the acquisition channels this business actually runs —
// admin still types the campaign name (e.g. the locality a banner is in).
const PRESETS = [
  { label: "Print banner / QR", source: "banner", medium: "offline" },
  { label: "Meta Ads", source: "meta", medium: "cpc" },
  { label: "Google Ads", source: "google", medium: "cpc" },
  { label: "WhatsApp share", source: "whatsapp", medium: "social" },
];

const buildUrl = ({ path, source, medium, campaign, term, content }) => {
  let url;
  try {
    url = new URL((path || "").trim() || "/", SITE_ORIGIN);
  } catch (_) {
    url = new URL(SITE_ORIGIN);
  }
  const set = (key, value) => {
    const v = value.trim();
    if (v) url.searchParams.set(key, v);
    else url.searchParams.delete(key);
  };
  set("utm_source", source);
  set("utm_medium", medium);
  set("utm_campaign", campaign);
  set("utm_term", term);
  set("utm_content", content);
  return url.toString();
};

export default function CampaignLinkBuilder() {
  const [path, setPath] = useState("/");
  const [source, setSource] = useState("banner");
  const [medium, setMedium] = useState("offline");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(
    () => buildUrl({ path, source, medium, campaign, term, content }),
    [path, source, medium, campaign, term, content]
  );

  // Regenerating the QR is a bit of work — debounce so fast typing doesn't
  // fire one encode per keystroke.
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      QRCode.toDataURL(url, { margin: 1, width: 260, color: { dark: "#101828", light: "#ffffff" } })
        .then((data) => { if (!cancelled) setQr(data); })
        .catch(() => { if (!cancelled) setQr(""); });
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {
      /* clipboard unavailable — link is still visible to select/copy manually */
    }
  };

  const downloadName = `qr_${(campaign || source || "campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;

  return <Paper elevation={0} className={styles.panel} sx={{ borderRadius: "16px" }}>
    <div className={styles.head}>
      <span className={styles.icon}><CampaignRoundedIcon fontSize="small" /></span>
      <div className={styles.headCopy}>
        <h2 className={styles.title}>Campaign link &amp; QR builder</h2>
        <p className={styles.subtitle}>Tag a banner, poster, or ad with a source/medium/campaign — scans and clicks show up under Traffic Sources below once it&apos;s live.</p>
      </div>
    </div>

    <div className={styles.presets}>
      {PRESETS.map((p) => <Chip
        key={p.label} label={p.label} size="small" variant="outlined"
        onClick={() => { setSource(p.source); setMedium(p.medium); }}
        className={styles.preset}
      />)}
    </div>

    <div className={styles.grid}>
      <TextField size="small" label="Landing path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/ or /search?location=kk-nagar" className={styles.field} />
      <TextField size="small" label="Source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="banner, meta, google…" className={styles.field} />
      <TextField size="small" label="Medium" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="offline, cpc, social…" className={styles.field} />
      <TextField size="small" label="Campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="kk-nagar-banner, thillai-nagar-banner…" className={styles.field} />
      <TextField size="small" label="Content (optional)" value={content} onChange={(e) => setContent(e.target.value)} placeholder="design-a, design-b…" className={styles.field} />
      <TextField size="small" label="Term (optional)" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="keyword, if any" className={styles.field} />
    </div>

    <div className={styles.output}>
      <div className={styles.qrWrap}>
        {qr ? <img src={qr} alt="Campaign QR code" className={styles.qrImg} /> : <div className={styles.qrPlaceholder} />}
      </div>
      <div className={styles.linkCol}>
        <TextField size="small" label="Generated link" value={url} InputProps={{ readOnly: true }} className={styles.linkField} multiline maxRows={2} />
        <div className={styles.actions}>
          <Button size="small" variant="outlined" startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />} onClick={copyLink} className={styles.actionBtn}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button size="small" variant="contained" disableElevation startIcon={<DownloadRoundedIcon />} disabled={!qr} component="a" href={qr} download={downloadName} className={styles.actionBtn}>
            Download QR
          </Button>
        </div>
      </div>
    </div>
  </Paper>;
}
