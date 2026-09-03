import React, { useEffect, useMemo, useState } from "react";
import { Paper, TextField, Button, Chip } from "@mui/material";
import QRCode from "qrcode";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import styles from "features/admin/analytics/site-analytics/CampaignLinkBuilder.module.css";

const SITE_ORIGIN = "https://massclick.in";
const PLAY_ORIGIN = "https://play.google.com/store/apps/details";
const ANDROID_PACKAGE = "com.massclick.massclick";

// Quick-fill chips for the acquisition channels this business actually runs —
// admin still types the campaign name (e.g. the locality a banner is in).
const WEB_PRESETS = [
  { label: "Print banner / QR", source: "banner", medium: "offline" },
  { label: "Meta Ads", source: "meta", medium: "cpc" },
  { label: "Google Ads", source: "google", medium: "cpc" },
  { label: "WhatsApp share", source: "whatsapp", medium: "social" },
];

// Play links are for driving *installs*, so the channels differ from web's.
// "google-play / organic" is what Play stamps on an unattributed store visit,
// so it is deliberately absent here — you never tag a link with it.
const PLAY_PRESETS = [
  { label: "Print banner / QR", source: "banner", medium: "offline" },
  { label: "Meta Ads", source: "meta", medium: "cpc" },
  { label: "Google Ads (UAC)", source: "google", medium: "cpc" },
  { label: "WhatsApp share", source: "whatsapp", medium: "social" },
  { label: "Influencer", source: "influencer", medium: "referral" },
];

const utmPairs = ({ source, medium, campaign, term, content }) => [
  ["utm_source", source],
  ["utm_medium", medium],
  ["utm_campaign", campaign],
  ["utm_term", term],
  ["utm_content", content],
].filter(([, value]) => (value || "").trim());

const buildWebUrl = ({ path, ...utm }) => {
  let url;
  try {
    url = new URL((path || "").trim() || "/", SITE_ORIGIN);
  } catch (_) {
    url = new URL(SITE_ORIGIN);
  }
  utmPairs(utm).forEach(([key, value]) => url.searchParams.set(key, value.trim()));
  return url.toString();
};

// Play delivers the whole `referrer` value back to the app verbatim via the
// Install Referrer library, so the utm_* pairs go in as ONE encoded query
// string — not as sibling params on the store URL, which Play would drop.
// InstallReferrerService._parse in the mobile app splits this back apart.
const buildPlayUrl = (utm) => {
  const url = new URL(PLAY_ORIGIN);
  url.searchParams.set("id", ANDROID_PACKAGE);
  const referrer = utmPairs(utm)
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`)
    .join("&");
  if (referrer) url.searchParams.set("referrer", referrer);
  return url.toString();
};

/// `target` picks what the link points at: "web" builds a massclick.in
/// landing URL, "play" builds a Play Store link whose install referrer the
/// mobile app reads back. Both feed the same /site-events/campaigns rollup,
/// so a campaign name can be shared across the two and compared.
export default function CampaignLinkBuilder({ target = "web" }) {
  const isPlay = target === "play";
  const [path, setPath] = useState("/");
  const [source, setSource] = useState("banner");
  const [medium, setMedium] = useState("offline");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const url = useMemo(
    () => (isPlay
      ? buildPlayUrl({ source, medium, campaign, term, content })
      : buildWebUrl({ path, source, medium, campaign, term, content })),
    [isPlay, path, source, medium, campaign, term, content]
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
        <h2 className={styles.title}>{isPlay ? "Play Store referral link & QR builder" : "Campaign link & QR builder"}</h2>
        <p className={styles.subtitle}>{isPlay
          ? "Tag a Play Store link with a source/medium/campaign. Android stamps it on the install, the app reads it back on first launch, and the installs show up under Install Sources below."
          : "Tag a banner, poster, or ad with a source/medium/campaign — scans and clicks show up under Traffic Sources below once it's live."}</p>
      </div>
    </div>

    <div className={styles.presets}>
      {(isPlay ? PLAY_PRESETS : WEB_PRESETS).map((p) => <Chip
        key={p.label} label={p.label} size="small" variant="outlined"
        onClick={() => { setSource(p.source); setMedium(p.medium); }}
        className={styles.preset}
      />)}
    </div>

    <div className={styles.grid}>
      {!isPlay && <TextField size="small" label="Landing path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/ or /search?location=kk-nagar" className={styles.field} />}
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
