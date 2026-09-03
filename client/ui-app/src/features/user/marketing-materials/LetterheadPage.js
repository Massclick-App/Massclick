import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BusinessIcon from "@mui/icons-material/Business";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import ViewDayOutlinedIcon from "@mui/icons-material/ViewDayOutlined";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import BrandingWatermarkIcon from "@mui/icons-material/BrandingWatermark";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import Footer from "features/public/footer/Footer.js";
import { findBusinessByMobile } from "state/actions/businessListAction.js";
import BusinessDocumentsNav from "features/user/marketing-materials/BusinessDocumentsNav.js";
import { getBusinessLogo, imageToDataUrl } from "features/user/marketing-materials/documentImageUtils.js";
import { formatFullBusinessAddress } from "shared/utils/formatBusinessAddress.js";
import styles from "features/user/marketing-materials/VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);

const letterheadTemplates = [
  { id:"modern", name:"Modern Professional", primary:"#10213d", accent:"#ff6418", soft:"#fff3ec", category:"Modern" },
  { id:"corporate", name:"Corporate Blue", primary:"#123b7a", accent:"#2c8cff", soft:"#eff7ff", category:"Corporate" },
  { id:"elegant-green", name:"Elegant Green", primary:"#075f4e", accent:"#18a873", soft:"#edfff7", category:"Elegant" },
  { id:"minimal", name:"Minimal White", primary:"#202a38", accent:"#d5a86d", soft:"#fafafa", category:"Minimal" },
  { id:"luxury", name:"Luxury Gold", primary:"#141923", accent:"#d6a934", soft:"#fff9e8", category:"Elegant", premium:true },
  { id:"creative-wave", name:"Creative Wave", primary:"#174b8a", accent:"#41a9ea", soft:"#eefaff", category:"Creative" },
  { id:"gradient-purple", name:"Gradient Purple", primary:"#56249d", accent:"#8c4fe3", soft:"#f7efff", category:"Creative" },
  { id:"classic-red", name:"Classic Red", primary:"#721012", accent:"#c31d22", soft:"#fff1f1", category:"Classic" },
  { id:"teal-professional", name:"Teal Professional", primary:"#075852", accent:"#20aa91", soft:"#ecfffb", category:"Professional" },
  { id:"executive-dark", name:"Executive Dark", primary:"#151a22", accent:"#d1a22e", soft:"#fff9e8", category:"Professional", premium:true },
  { id:"light-elegant", name:"Light Elegant", primary:"#5a4a31", accent:"#d4ae72", soft:"#fff9ee", category:"Elegant" },
  { id:"blue-geometry", name:"Blue Geometry", primary:"#123b86", accent:"#316bd5", soft:"#eef4ff", category:"Modern" },
  { id:"green-curve", name:"Green Curve", primary:"#087745", accent:"#35b965", soft:"#effff4", category:"Business" },
  { id:"pink-elegance", name:"Pink Elegance", primary:"#86455f", accent:"#eda3bc", soft:"#fff1f6", category:"Elegant" },
  { id:"navy-orange", name:"Navy Orange", primary:"#071b36", accent:"#ff5a16", soft:"#fff3ed", category:"Corporate", premium:true },
  { id:"corporate-modern", name:"Corporate Modern", primary:"#1c2939", accent:"#326796", soft:"#f1f6fa", category:"Corporate" },
  { id:"maroon-classic", name:"Maroon Classic", primary:"#681323", accent:"#be3347", soft:"#fff1f3", category:"Classic" },
  { id:"aqua-fresh", name:"Aqua Fresh", primary:"#176d72", accent:"#69d7c8", soft:"#edfffc", category:"Creative" },
  { id:"black-white", name:"Black & White", primary:"#171717", accent:"#545454", soft:"#f5f5f5", category:"Minimal" },
  { id:"violet-edge", name:"Violet Edge", primary:"#4d2a86", accent:"#8f55dc", soft:"#f6efff", category:"Modern" },
  { id:"silver-minimal", name:"Silver Minimal", primary:"#49515d", accent:"#aeb5bf", soft:"#f6f7f8", category:"Minimal" },
  { id:"sunrise-orange", name:"Sunrise Orange", primary:"#9a3b12", accent:"#ff8a32", soft:"#fff4ea", category:"Creative" },
  { id:"sky-professional", name:"Sky Professional", primary:"#195a91", accent:"#43a5ef", soft:"#eff9ff", category:"Professional" },
  { id:"forest-business", name:"Forest Business", primary:"#0d5137", accent:"#3b9664", soft:"#effaf4", category:"Business" },
  { id:"premium-black", name:"Premium Black Gold", primary:"#111722", accent:"#cda43b", soft:"#fff9e8", category:"Elegant", premium:true },
];

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};

const createSlug = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const compact = (...values) =>
  values
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "-")
    .join(", ");

const normalizeList = (...values) =>
  values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      return String(value || "").split(/[,/|]+/);
    })
    .map((value) => String(value || "").trim())
    .filter((value) => value && value !== "-");

const uniqueValues = (values = []) =>
  values.filter((value, index, list) => {
    const normalized = String(value).replace(/\D/g, "") || String(value).toLowerCase();
    return list.findIndex((item) => {
      const itemNormalized = String(item).replace(/\D/g, "") || String(item).toLowerCase();
      return itemNormalized === normalized;
    }) === index;
  });

const getInitials = (value = "") => {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "M";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
};

const svgText = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const limitText = (value = "", max = 80) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

// See QuotationPage: the letterhead prints the same address and must not
// disagree with what the site shows.
const getBusinessAddress = (business = {}) =>
  formatFullBusinessAddress(business) ||
  compact(business.globalAddress, business.location) ||
  "Tamil Nadu";

const getBusinessProfile = (business = {}, storedUser = {}) => {
  const phones = uniqueValues(
    normalizeList(
      business.contact,
      business.contactList,
      business.whatsappNumber,
      storedUser.mobileNumber1,
      storedUser.mobileNumber2,
      storedUser.contact
    )
  ).slice(0, 2);

  return {
    businessName: business.businessName || business.name || storedUser.businessName || "Your Business Name",
    tagLine: business.title || business.category || "Professional Business Services",
    phones,
    email: business.email || storedUser.email || "info@business.com",
    website: business.website || "massclick.in",
    location: getBusinessAddress(business),
    category: business.category || "Business Services",
    gst: business.gstin || "",
    logoImage: getBusinessLogo(business),
  };
};

const LETTERHEAD_DRAFT_KEY = "massclickLetterheadDraft";

const todayDisplay = () => new Date().toLocaleDateString("en-IN");

const createDefaultLetterheadDraft = () => ({
  date: todayDisplay(),
  to: "",
  subject: "",
  body: "",
});

const readLetterheadDraft = () => {
  try {
    const draft = JSON.parse(localStorage.getItem(LETTERHEAD_DRAFT_KEY) || "null");
    return draft ? { ...createDefaultLetterheadDraft(), ...draft } : null;
  } catch {
    return null;
  }
};

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const svgLine = (text, x, y, size, color, weight = 500, extra = "") =>
  `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${svgText(text)}</text>`;

const wrapText = (value = "", maxChars = 86, maxLines = 9) => {
  const paragraphs = String(value || "").split(/\r?\n/);
  const lines = [];

  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      if (lines.length < maxLines) lines.push("");
      return;
    }

    words.forEach((word) => {
      if (!lines.length) lines.push("");
      const current = lines[lines.length - 1] || "";
      const next = current ? `${current} ${word}` : word;

      if (!current || next.length <= maxChars) {
        lines[lines.length - 1] = next;
      } else if (lines.length < maxLines) {
        lines.push(word);
      }
    });
  });

  return lines.slice(0, maxLines);
};

const svgTextLines = (lines, x, y, size, color, weight = 500, lineGap = 44) =>
  lines
    .filter((line) => String(line || "").trim())
    .map((line, index) => svgLine(line, x, y + index * lineGap, size, color, weight))
    .join("");

const svgInfo = (label, value, x, y, template) => `
  <circle cx="${x}" cy="${y - 7}" r="15" fill="${template.accent}" opacity="0.16" />
  ${svgLine(label, x - 7, y - 1, 12, template.accent, 850)}
  ${svgLine(limitText(value, 42), x + 28, y, 18, "#334155", 700)}
`;

const svgLetterheadLogo = (profile, template) => {
  if (profile.logoImage) {
    return `
      <defs>
        <clipPath id="letterheadLogoClip">
          <circle cx="118" cy="130" r="42" />
        </clipPath>
      </defs>
      <circle cx="118" cy="130" r="54" fill="#ffffff" />
      <circle cx="118" cy="130" r="42" fill="#ffffff" />
      <image href="${svgText(profile.logoImage)}" x="76" y="88" width="84" height="84" preserveAspectRatio="xMidYMid meet" clip-path="url(#letterheadLogoClip)" />
    `;
  }

  const initials = getInitials(profile.businessName);
  return `
    <circle cx="118" cy="130" r="54" fill="#ffffff" />
    <circle cx="118" cy="130" r="42" fill="${template.primary}" />
    ${svgLine(initials, 88, 150, 38, "#ffffff", 850)}
  `;
};

const buildLetterheadSvg = (profile, template, draft = createDefaultLetterheadDraft()) => {
  const phones = profile.phones.length ? profile.phones.join(" / ") : "+91 98765 43210";
  const initials = getInitials(profile.businessName);
  const address = limitText(profile.location, 86);
  const footerLine = [phones, profile.email, profile.website].filter(Boolean).join("  |  ");
  const toLines = wrapText(draft.to, 48, 2);
  const bodyLines = wrapText(draft.body, 92, 9);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754">
    <rect width="1240" height="1754" fill="#ffffff" />
    <rect x="0" y="0" width="1240" height="228" fill="${template.primary}" />
    <rect x="0" y="0" width="1240" height="16" fill="${template.accent}" />
    <path d="M0 228 H1240 V286 C1005 256 871 302 688 264 C482 222 300 230 0 284 Z" fill="${template.accent}" opacity="0.95" />
    <path d="M0 286 C288 228 482 314 714 274 C912 240 1042 244 1240 280 V326 C1010 286 846 310 674 342 C452 382 282 312 0 354 Z" fill="${template.soft}" />
    ${svgLetterheadLogo(profile, template)}
    ${svgLine(limitText(profile.businessName, 34), 194, 118, 43, "#ffffff", 850)}
    ${svgLine(limitText(profile.tagLine, 58), 198, 156, 21, "#f8fafc", 600)}
    <rect x="198" y="178" width="330" height="6" rx="3" fill="${template.accent}" />
    <rect x="844" y="72" width="292" height="128" rx="20" fill="#ffffff" opacity="0.1" />
    ${svgLine("BUSINESS CONTACT", 878, 112, 16, "#ffffff", 850)}
    ${svgLine(limitText(phones, 32), 878, 144, 21, "#ffffff", 800)}
    ${svgLine(limitText(profile.email, 32), 878, 174, 17, "#f8fafc", 650)}

    <rect x="86" y="326" width="1068" height="96" rx="18" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
    ${svgInfo("P", phones, 128, 376, template)}
    ${svgInfo("E", profile.email, 472, 376, template)}
    ${svgInfo("W", profile.website, 820, 376, template)}
    ${svgInfo("L", address, 128, 410, template)}

    <circle cx="620" cy="920" r="300" fill="${template.accent}" opacity="0.035" />
    ${svgLine(initials, 510, 972, 168, template.primary, 850, 'opacity="0.04"')}
    ${svgLine("Date:", 118, 518, 24, "#1f2937", 750)}
    <line x1="184" y1="516" x2="390" y2="516" stroke="#cbd5e1" stroke-width="2" />
    ${draft.date ? svgLine(limitText(draft.date, 24), 198, 510, 20, "#0f172a", 600) : ""}
    ${svgLine("To,", 118, 606, 24, "#1f2937", 750)}
    <line x1="118" y1="662" x2="640" y2="662" stroke="#e2e8f0" stroke-width="2" />
    <line x1="118" y1="724" x2="640" y2="724" stroke="#e2e8f0" stroke-width="2" />
    ${svgTextLines(toLines, 118, 650, 20, "#0f172a", 600, 62)}
    ${svgLine("Subject:", 118, 826, 24, "#1f2937", 850)}
    <line x1="222" y1="824" x2="1060" y2="824" stroke="#cbd5e1" stroke-width="2" />
    ${draft.subject ? svgLine(limitText(draft.subject, 74), 242, 818, 20, "#0f172a", 650) : ""}
    ${Array.from({ length: 9 }, (_, index) => {
      const y = 934 + index * 72;
      return `<line x1="118" y1="${y}" x2="1122" y2="${y}" stroke="#edf2f7" stroke-width="2" />`;
    }).join("")}
    ${svgTextLines(bodyLines, 118, 920, 20, "#0f172a", 500, 72)}

    <rect x="0" y="1530" width="1240" height="224" fill="${template.primary}" />
    <path d="M0 1530 C262 1476 420 1584 642 1532 C866 1480 1034 1486 1240 1530 V1588 C1026 1552 862 1568 668 1618 C432 1676 246 1574 0 1632 Z" fill="${template.accent}" />
    <rect x="86" y="1562" width="1068" height="3" fill="#ffffff" opacity="0.88" />
    ${svgLine(footerLine, 118, 1640, 20, "#ffffff", 800)}
    ${svgLine(address, 118, 1680, 18, "#f8fafc", 650)}
    ${profile.gst ? svgLine(`GST: ${profile.gst}`, 118, 1716, 16, "#f8fafc", 650) : ""}
    ${svgLine(limitText(profile.category, 34), 910, 1716, 16, "#ffffff", 800)}
  </svg>`;
};

const createLetterheadPng = async (profile, template, draft) => {
  const exportProfile = {
    ...profile,
    logoImage: await imageToDataUrl(profile.logoImage),
  };

  return (
  new Promise((resolve, reject) => {
    const svg = buildLetterheadSvg(exportProfile, template, draft);
    const image = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1240;
      canvas.height = 1754;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to create letterhead image."));
      }, "image/png", 0.96);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to render letterhead image."));
    };

    image.src = url;
  })
  );
};

const LetterheadPreview = ({ profile, template, draft, onDraftChange }) => {
  const phones = profile.phones.length ? profile.phones.join(" / ") : "+91 98765 43210";
  const initials = getInitials(profile.businessName);
  const updateDraft = (field) => (event) => onDraftChange(field, event.target.value);

  return (
    <article
      className={cx("letterhead-sheet")}
      style={{
        "--letterhead-primary": template.primary,
        "--letterhead-accent": template.accent,
        "--letterhead-soft": template.soft,
      }}
    >
      <header className={cx("letterhead-top")}>
        <div className={cx("letterhead-brand")}>
          <div className={cx("letterhead-logo")}>
            {profile.logoImage ? (
              <img src={profile.logoImage} alt={`${profile.businessName} logo`} />
            ) : (
              initials
            )}
          </div>
          <div>
            <h2>{profile.businessName}</h2>
            <p>{profile.tagLine}</p>
          </div>
        </div>
        <div className={cx("letterhead-contact-card")}>
          <span>Business Contact</span>
          <div><b>P</b><p><small>Phone</small><strong>{phones}</strong></p></div>
          <div><b>E</b><p><small>Email</small><strong>{profile.email}</strong></p></div>
        </div>
      </header>

      <section className={cx("letterhead-info-strip")}>
        <span className={cx("letterhead-info-item")}><strong>P</strong><span><small>Phone</small><b>{phones}</b></span></span>
        <span className={cx("letterhead-info-item")}><strong>E</strong><span><small>Email</small><b>{profile.email}</b></span></span>
        <span className={cx("letterhead-info-item")}><strong>W</strong><span><small>Website</small><b>{profile.website}</b></span></span>
        <span className={cx("letterhead-info-item letterhead-address-item")}><strong>L</strong><span><small>Registered Address</small><b>{profile.location}</b></span></span>
      </section>

      <div className={cx("letterhead-body")}>
        <div className={cx("letterhead-watermark")}>{initials}</div>
        <div className={cx("letterhead-field-row")}>
          <strong>Date:</strong>
          <input
            value={draft.date}
            onChange={updateDraft("date")}
            placeholder="Date"
            aria-label="Letterhead date"
          />
        </div>
        <div className={cx("letterhead-address-block")}>
          <strong>To,</strong>
          <textarea
            value={draft.to}
            onChange={updateDraft("to")}
            rows={2}
            placeholder="Recipient name and address"
            aria-label="Letterhead recipient"
          />
        </div>
        <div className={cx("letterhead-field-row letterhead-subject-row")}>
          <strong>Subject:</strong>
          <input
            value={draft.subject}
            onChange={updateDraft("subject")}
            placeholder="Subject"
            aria-label="Letterhead subject"
          />
        </div>
        <div className={cx("letterhead-writing-lines")}>
          {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
          <textarea
            value={draft.body}
            onChange={updateDraft("body")}
            rows={9}
            placeholder="Type your letter content here"
            aria-label="Letterhead body"
          />
        </div>
      </div>

      <footer className={cx("letterhead-footer")}>
        <div>
          <strong>{[phones, profile.email, profile.website].filter(Boolean).join(" | ")}</strong>
          <span>{profile.location}</span>
          {profile.gst && <span>GST: {profile.gst}</span>}
        </div>
        <small>{profile.category}</small>
      </footer>
    </article>
  );
};

const LetterheadThumbnail = ({ profile, template }) => (
  <div className={cx("letterhead-catalogue-sheet", `letterhead-catalogue-${template.id}`)} style={{ "--lh-primary":template.primary, "--lh-accent":template.accent, "--lh-soft":template.soft }}>
    <header><span>{profile.logoImage ? <img src={profile.logoImage} alt="" /> : getInitials(profile.businessName)}</span><div><strong>{profile.businessName}</strong><small>{profile.tagLine}</small></div><i /></header>
    <div className={cx("catalogue-meta")}><b>To,</b><em>Date: {todayDisplay()}</em><span>Recipient Name</span><span>Managing Director</span><strong>Subject: Professional business communication</strong></div>
    <div className={cx("catalogue-lines")}>{Array.from({ length:7 }, (_, index) => <i key={index} />)}</div>
    <footer>{profile.email} · {profile.website}</footer>
  </div>
);

const LetterheadEditorSection = ({ title, subtitle, panel, icon, openPanel, setOpenPanel, children }) => (
  <section className={cx("customizer-section")}>
    <button type="button" className={cx("accordion-trigger")} onClick={() => setOpenPanel(openPanel === panel ? "" : panel)} aria-expanded={openPanel === panel}>
      <span>{icon}<span><b>{title}</b>{subtitle && <small>{subtitle}</small>}</span></span>
      <ExpandMoreIcon className={cx(openPanel === panel && "accordion-icon-open")} />
    </button>
    {openPanel === panel && children}
  </section>
);

export default function LetterheadPage() {
  const dispatch = useDispatch();
  const { matchedBusiness, matchedBusinessLoading, matchedBusinessError } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const storedUser = useMemo(readStoredUser, []);
  const mobileNumber = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.contact || "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(letterheadTemplates[0].id);
  const [customColors, setCustomColors] = useState({
    primary: letterheadTemplates[0].primary,
    accent: letterheadTemplates[0].accent,
  });
  const [draft, setDraft] = useState(() => readLetterheadDraft() || createDefaultLetterheadDraft());
  const [statusMessage, setStatusMessage] = useState("");
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [profileEdits, setProfileEdits] = useState({});
  const [templateCategory, setTemplateCategory] = useState("All");
  const [templateSearch, setTemplateSearch] = useState("");
  const [openPanel, setOpenPanel] = useState("business");

  useEffect(() => {
    if (mobileNumber) dispatch(findBusinessByMobile(mobileNumber));
  }, [dispatch, mobileNumber]);

  useEffect(() => {
    localStorage.setItem(LETTERHEAD_DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const baseTemplate =
    letterheadTemplates.find((template) => template.id === selectedTemplateId) || letterheadTemplates[0];
  const selectedTemplate = {
    ...baseTemplate,
    primary: customColors.primary,
    accent: customColors.accent,
  };
  const businessProfile = getBusinessProfile(matchedBusiness || {}, storedUser);
  const profile = { ...businessProfile, ...profileEdits };
  const filteredTemplates = letterheadTemplates.filter((template) =>
    (templateCategory === "All" || template.category === templateCategory) &&
    template.name.toLowerCase().includes(templateSearch.trim().toLowerCase())
  );
  const fileName = `${createSlug(profile.businessName) || "massclick"}-letterhead.png`;
  const updateProfile = (field, value) => setProfileEdits((current) => ({ ...current, [field]: value }));
  const updatePhone = (index, value) => {
    const phones = [...(profile.phones || [])];
    phones[index] = value;
    updateProfile("phones", phones);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplateId(template.id);
    setCustomColors({
      primary: template.primary,
      accent: template.accent,
    });
  };

  const handleTemplatePreview = (template) => {
    handleTemplateSelect(template);
    setIsDesignModalOpen(true);
  };

  const handleColorChange = (field, value) => {
    setCustomColors((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDraftChange = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleResetDraft = () => {
    const nextDraft = createDefaultLetterheadDraft();
    setDraft(nextDraft);
    localStorage.removeItem(LETTERHEAD_DRAFT_KEY);
    setStatusMessage("Letterhead text cleared.");
  };

  const handleResetColors = () => {
    setCustomColors({
      primary: baseTemplate.primary,
      accent: baseTemplate.accent,
    });
    setStatusMessage("Theme colors reset.");
  };

  const handleCopyContact = async () => {
    const details = [
      profile.businessName,
      profile.tagLine,
      profile.phones.length ? `Phone: ${profile.phones.join(", ")}` : "",
      profile.email ? `Email: ${profile.email}` : "",
      profile.website ? `Website: ${profile.website}` : "",
      profile.location ? `Address: ${profile.location}` : "",
      profile.gst ? `GST: ${profile.gst}` : "",
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setStatusMessage("Letterhead contact details copied.");
    } catch {
      setStatusMessage("Copy failed. Please try again.");
    }
  };

  const handleDownload = async () => {
    setStatusMessage("");
    try {
      const blob = await createLetterheadPng(profile, selectedTemplate, draft);
      downloadBlob(blob, fileName);
      setStatusMessage("Letterhead downloaded.");
    } catch (error) {
      setStatusMessage(error.message || "Download failed.");
    }
  };

  return (
    <>
      <StickySearchBar />
      <main className={cx("visiting-card-page")}>
        <div className={cx("document-back-row")}><BusinessDocumentsNav /></div>

        {!mobileNumber && (
          <div className={cx("notice-box")}>Login mobile number was not found. Please log in again.</div>
        )}

        {matchedBusinessError && (
          <div className={cx("notice-box")}>{matchedBusinessError}</div>
        )}

        <section className={cx("letterhead-studio-layout")}>
          <div className={cx("letterhead-studio-main")}>
            <section className={cx("letterhead-hero")}>
              <div><span>Professional Letterheads</span><h2>Build trust with every business communication</h2><p>Choose from 25 international-quality templates. Customize, preview and download a print-ready letterhead.</p><button type="button" onClick={() => setIsDesignModalOpen(true)}>Create Custom Letterhead</button></div>
              <button
                type="button"
                className={cx("hero-letterhead-preview")}
                onClick={() => setIsDesignModalOpen(true)}
                aria-label={`Open large preview of ${selectedTemplate.name}`}
              >
                <LetterheadThumbnail profile={profile} template={selectedTemplate} />
                <span className={cx("hero-preview-hint")}><b>Open full editor</b><small>Click to edit and type letterhead content</small></span>
              </button>
            </section>
            <div className={cx("letterhead-stats")}><span><b>25+</b><small>Premium Templates</small></span><span><b>20+</b><small>Color Themes</small></span><span><b>10+</b><small>Business Categories</small></span><span><b>100%</b><small>Editable</small></span><span><b>1 Click</b><small>Download & Share</small></span></div>
            <div className={cx("letterhead-catalogue-head")}>
              <div><strong>Choose a Category</strong><nav>{["All","Corporate","Business","Creative","Minimal","Professional","Modern","Elegant","Classic"].map((category) => <button type="button" key={category} className={cx(templateCategory === category && "category-active")} onClick={() => setTemplateCategory(category)}>{category === "All" ? "All 25" : category}</button>)}</nav></div>
              <label className={cx("template-search")}><SearchIcon /><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates..." /></label>
            </div>
            <div className={cx("letterhead-catalogue-grid")}>
              {filteredTemplates.map((template) => <button type="button" key={template.id} className={cx("letterhead-catalogue-card", selectedTemplateId === template.id && "letterhead-catalogue-active")} onClick={() => handleTemplatePreview(template)} aria-label={`Open full preview of ${template.name}`}><LetterheadThumbnail profile={profile} template={template} /><span>{letterheadTemplates.findIndex((item) => item.id === template.id) + 1}. {template.name}{template.premium && <b>♛ PRO</b>}</span></button>)}
            </div>
            {!filteredTemplates.length && <p className={cx("empty-templates")}>No letterhead templates match your search.</p>}
          </div>

          <aside className={cx("customizer letterhead-customizer")}>
            <header><strong>Customize Your Letterhead</strong><button type="button" onClick={() => { setProfileEdits({}); handleResetColors(); }}>↻ Reset</button></header>
            <LetterheadEditorSection title="Business Details" subtitle="Edit company information" panel="business" icon={<BusinessIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("profile-fields")}><label>Business Name<input value={profile.businessName} onChange={(event) => updateProfile("businessName", event.target.value)} /></label><label>Tagline<input value={profile.tagLine} onChange={(event) => updateProfile("tagLine", event.target.value)} /></label><label>Category<input value={profile.category} onChange={(event) => updateProfile("category", event.target.value)} /></label><label>GST / Tax Number<input value={profile.gst} onChange={(event) => updateProfile("gst", event.target.value)} /></label></div></LetterheadEditorSection>
            <LetterheadEditorSection title="Logo & Brand" subtitle="Upload logo and brand colors" panel="brand" icon={<ImageOutlinedIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("profile-fields")}><label>Logo Image URL<input value={profile.logoImage || ""} onChange={(event) => updateProfile("logoImage", event.target.value)} /></label><label>Header Color<input type="color" value={customColors.primary} onChange={(event) => handleColorChange("primary", event.target.value)} /></label><label>Accent Color<input type="color" value={customColors.accent} onChange={(event) => handleColorChange("accent", event.target.value)} /></label></div></LetterheadEditorSection>
            <LetterheadEditorSection title="Header Design" subtitle="Choose header style" panel="header" icon={<ViewDayOutlinedIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("design-options")}>{letterheadTemplates.map((template) => <button type="button" key={template.id} className={cx(selectedTemplateId === template.id && "design-option-active")} onClick={() => handleTemplateSelect(template)}><i style={{background:template.accent}} />{template.name}</button>)}</div></LetterheadEditorSection>
            <LetterheadEditorSection title="Content Style" subtitle="Recipient, date and letter content" panel="content" icon={<FormatAlignLeftIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("profile-fields")}><label>Date<input value={draft.date} onChange={(event) => handleDraftChange("date", event.target.value)} /></label><label>Recipient<textarea value={draft.to} onChange={(event) => handleDraftChange("to", event.target.value)} /></label><label>Subject<input value={draft.subject} onChange={(event) => handleDraftChange("subject", event.target.value)} /></label><label>Letter Content<textarea rows="6" value={draft.body} onChange={(event) => handleDraftChange("body", event.target.value)} /></label></div></LetterheadEditorSection>
            <LetterheadEditorSection title="Footer Design" subtitle="Contact and footer information" panel="footer" icon={<ViewDayOutlinedIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("profile-fields")}><label>Primary Phone<input value={profile.phones?.[0] || ""} onChange={(event) => updatePhone(0,event.target.value)} /></label><label>Alternate Phone<input value={profile.phones?.[1] || ""} onChange={(event) => updatePhone(1,event.target.value)} /></label><label>Email<input value={profile.email} onChange={(event) => updateProfile("email",event.target.value)} /></label><label>Website<input value={profile.website} onChange={(event) => updateProfile("website",event.target.value)} /></label><label>Full Address<textarea value={profile.location} onChange={(event) => updateProfile("location",event.target.value)} /></label></div></LetterheadEditorSection>
            <LetterheadEditorSection title="Watermark" subtitle="Add watermark or pattern" panel="watermark" icon={<BrandingWatermarkIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("profile-fields")}><p className={cx("editor-help")}>Your business initials are automatically used as a subtle professional watermark.</p></div></LetterheadEditorSection>
            <LetterheadEditorSection title="Page Setup & Background" subtitle="A4 print-ready settings" panel="page" icon={<SettingsOutlinedIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}><div className={cx("profile-fields")}><p className={cx("editor-help")}>A4 portrait · 300 DPI export · safe print margins · white document background.</p></div></LetterheadEditorSection>
            <div className={cx("customizer-actions")}><button type="button" className={cx("save-preview")} onClick={handleDownload}><DownloadIcon /> Download Letterhead</button><button type="button" onClick={handleCopyContact}><ContentCopyIcon /> Copy Business Details</button><button type="button" onClick={handleResetDraft}>Clear Letter Content</button></div>
            {statusMessage && <p className={cx("status-message")}>{statusMessage}</p>}
          </aside>
        </section>

        {isDesignModalOpen && (
          <div className={cx("document-modal-overlay")} role="presentation">
            <section className={cx("document-modal letterhead-full-preview-modal")} role="dialog" aria-modal="true" aria-labelledby="letterhead-design-title">
              <header className={cx("document-modal-header")}>
                <div>
                  <span>Business Stationery</span>
                  <h2 id="letterhead-design-title">Full Letterhead Preview — {selectedTemplate.name}</h2>
                </div>
                <button type="button" className={cx("icon-action")} onClick={() => setIsDesignModalOpen(false)} aria-label="Close design settings">
                  <CloseIcon />
                </button>
              </header>

              <div className={cx("document-modal-body")}>
                <div className={cx("letterhead-live-preview")}>
                  {matchedBusinessLoading ? (
                    <div className={cx("loading-box")}>Loading your business letterhead details...</div>
                  ) : (
                    <LetterheadPreview profile={profile} template={selectedTemplate} draft={draft} onDraftChange={handleDraftChange} />
                  )}
                </div>
                <aside className={cx("letterhead-preview-settings")}>
                <div className={cx("letterhead-theme-grid")}>
                  {letterheadTemplates.map((template, index) => (
                    <button
                      type="button"
                      key={template.id}
                      className={cx(
                        "letterhead-theme-option",
                        selectedTemplateId === template.id && "letterhead-theme-option-active"
                      )}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <span
                        className={cx("letterhead-theme-swatch")}
                        style={{
                          "--letterhead-primary": template.primary,
                          "--letterhead-accent": template.accent,
                        }}
                      />
                      <span>{index + 1}. {template.name}</span>
                    </button>
                  ))}
                </div>

                <div className={cx("letterhead-color-controls")}>
                  <label>
                    <span>Header</span>
                    <input
                      type="color"
                      value={customColors.primary}
                      onChange={(event) => handleColorChange("primary", event.target.value)}
                      aria-label="Customize letterhead header color"
                    />
                  </label>
                  <label>
                    <span>Accent</span>
                    <input
                      type="color"
                      value={customColors.accent}
                      onChange={(event) => handleColorChange("accent", event.target.value)}
                      aria-label="Customize letterhead accent color"
                    />
                  </label>
                </div>
                </aside>
              </div>

              <footer className={cx("document-modal-actions")}>
                <button type="button" className={cx("secondary-action")} onClick={handleResetColors}>
                  Reset Colors
                </button>
                <button type="button" className={cx("primary-action")} onClick={handleDownload}>
                  <DownloadIcon /> Download High-Resolution Letterhead
                </button>
              </footer>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
