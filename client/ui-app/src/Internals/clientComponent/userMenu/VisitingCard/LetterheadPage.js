import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import PaletteIcon from "@mui/icons-material/Palette";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import { findBusinessByMobile } from "../../../../redux/actions/businessListAction";
import BusinessDocumentsNav from "./BusinessDocumentsNav";
import { getBusinessLogo, imageToDataUrl } from "./documentImageUtils";
import styles from "./VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);

const letterheadTemplates = [
  { id: "massclick", name: "MassClick Orange", primary: "#07122f", accent: "#ff6b16", soft: "#fff7ed" },
  { id: "royal", name: "Royal Blue", primary: "#102a56", accent: "#2563eb", soft: "#eff6ff" },
  { id: "emerald", name: "Emerald Trust", primary: "#063b35", accent: "#10b981", soft: "#ecfdf5" },
  { id: "maroon", name: "Maroon Classic", primary: "#4a0f1c", accent: "#be123c", soft: "#fff1f2" },
  { id: "slate", name: "Slate Executive", primary: "#111827", accent: "#64748b", soft: "#f8fafc" },
  { id: "teal", name: "Teal Global", primary: "#083344", accent: "#06b6d4", soft: "#ecfeff" },
  { id: "indigo", name: "Indigo Prime", primary: "#1e1b4b", accent: "#6366f1", soft: "#eef2ff" },
  { id: "gold", name: "Black Gold", primary: "#15110a", accent: "#c7972e", soft: "#fffbeb" },
  { id: "green", name: "Local Green", primary: "#17351f", accent: "#65a30d", soft: "#f7fee7" },
  { id: "red", name: "Red Corporate", primary: "#3f1111", accent: "#dc2626", soft: "#fef2f2" },
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

const getBusinessAddress = (business = {}) => {
  const structuredAddress = compact(
    business.plotNumber,
    business.street,
    business.pincode,
    business.location
  );

  return structuredAddress || compact(business.globalAddress, business.location) || "Tamil Nadu";
};

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
          <strong>{phones}</strong>
          <small>{profile.email}</small>
        </div>
      </header>

      <section className={cx("letterhead-info-strip")}>
        <span><strong>P</strong>{phones}</span>
        <span><strong>E</strong>{profile.email}</span>
        <span><strong>W</strong>{profile.website}</span>
        <span><strong>L</strong>{profile.location}</span>
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
  const profile = getBusinessProfile(matchedBusiness || {}, storedUser);
  const fileName = `${createSlug(profile.businessName) || "massclick"}-letterhead.png`;

  const handleTemplateSelect = (template) => {
    setSelectedTemplateId(template.id);
    setCustomColors({
      primary: template.primary,
      accent: template.accent,
    });
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
        <section className={cx("page-header")}>
          <BusinessDocumentsNav />
          <span>Business Stationery</span>
          <h1>Premium Letterhead Templates</h1>
          <p>Select a color theme, preview the full letterpad, and download it as a high-resolution PNG.</p>
        </section>

        {!mobileNumber && (
          <div className={cx("notice-box")}>Login mobile number was not found. Please log in again.</div>
        )}

        {matchedBusinessError && (
          <div className={cx("notice-box")}>{matchedBusinessError}</div>
        )}

        <section className={cx("letterhead-workspace document-output-workspace")}>
          <div className={cx("letterhead-preview-panel")}>
            <div className={cx("document-output-toolbar")}>
              <button type="button" className={cx("secondary-action")} onClick={() => setIsDesignModalOpen(true)}>
                <PaletteIcon />
                Theme
              </button>
              <button type="button" className={cx("secondary-action")} onClick={handleResetDraft}>
                Clear Text
              </button>
              <button type="button" className={cx("primary-action")} onClick={handleDownload}>
                <DownloadIcon />
                Download Letterhead
              </button>
              <button type="button" className={cx("icon-action")} onClick={handleCopyContact} aria-label="Copy letterhead contact details">
                <ContentCopyIcon />
              </button>
            </div>

            {matchedBusinessLoading ? (
              <div className={cx("loading-box")}>Loading your business letterhead details...</div>
            ) : (
              <LetterheadPreview
                profile={profile}
                template={selectedTemplate}
                draft={draft}
                onDraftChange={handleDraftChange}
              />
            )}
            {statusMessage && <p className={cx("status-message")}>{statusMessage}</p>}
          </div>

        </section>

        {isDesignModalOpen && (
          <div className={cx("document-modal-overlay")} role="presentation">
            <section className={cx("document-modal")} role="dialog" aria-modal="true" aria-labelledby="letterhead-design-title">
              <header className={cx("document-modal-header")}>
                <div>
                  <span>Business Stationery</span>
                  <h2 id="letterhead-design-title">Choose Letterhead Style</h2>
                </div>
                <button type="button" className={cx("icon-action")} onClick={() => setIsDesignModalOpen(false)} aria-label="Close design settings">
                  <CloseIcon />
                </button>
              </header>

              <div className={cx("document-modal-body")}>
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
              </div>

              <footer className={cx("document-modal-actions")}>
                <button type="button" className={cx("secondary-action")} onClick={handleResetColors}>
                  Reset Colors
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
