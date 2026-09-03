import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import PaletteIcon from "@mui/icons-material/Palette";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LinkIcon from "@mui/icons-material/Link";
import BrushIcon from "@mui/icons-material/Brush";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import StickySearchBar from "features/public/sticky-search-bar/StickySearchBar.js";
import Footer from "features/public/footer/Footer.js";
import { findBusinessByMobile } from "state/actions/businessListAction.js";
import BusinessDocumentsNav from "features/user/marketing-materials/BusinessDocumentsNav.js";
import { getBusinessLogo, imageToDataUrl } from "features/user/marketing-materials/documentImageUtils.js";
import { buildBusinessPath, createDistrictSlug } from "shared/utils/searchResultNavigation.js";
import styles from "features/user/marketing-materials/VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);

const templates = [
  { id: "modern", name: "Modern Professional", className: "template-modern", accent: "#0b67d8", category: "Modern" },
  { id: "dark", name: "Dark Premium", className: "template-dark", accent: "#d9ad3a", category: "Professional", premium: true },
  { id: "massclick", name: "Orange MassClick", className: "template-massclick", accent: "#f97316", category: "Creative" },
  { id: "corporate", name: "Corporate Blue", className: "template-corporate", accent: "#154aa3", category: "Professional" },
  { id: "luxury", name: "Luxury Gold", className: "template-luxury", accent: "#c7972e", category: "Luxury", premium: true },
  { id: "elegant-green", name: "Elegant Green", className: "template-elegant-green", accent: "#119a7b", category: "Professional" },
  { id: "gradient", name: "Gradient Purple", className: "template-gradient", accent: "#7651df", category: "Creative" },
  { id: "minimal-dark", name: "Minimal Dark", className: "template-minimal-dark", accent: "#687386", category: "Minimal", premium: true },
  { id: "classic-red", name: "Classic Red", className: "template-classic-red", accent: "#b51619", category: "Professional" },
  { id: "wave-blue", name: "Wave Blue", className: "template-wave-blue", accent: "#2478ef", category: "Creative" },
  { id: "teal-hexagon", name: "Teal Hexagon", className: "template-teal-hexagon", accent: "#168d83", category: "Modern" },
  { id: "tech-green", name: "Tech Green", className: "template-tech-green", accent: "#63a914", category: "Modern", premium: true },
  { id: "blue-geometry", name: "Blue Geometry", className: "template-blue-geometry", accent: "#1f59bc", category: "Modern" },
  { id: "pink-elegance", name: "Pink Elegance", className: "template-pink-elegance", accent: "#dc7198", category: "Luxury" },
  { id: "navy-orange", name: "Navy Orange", className: "template-navy-orange", accent: "#f45112", category: "Professional", premium: true },
  { id: "classic-beige", name: "Classic Beige", className: "template-classic-beige", accent: "#ba8b38", category: "Luxury" },
  { id: "maroon-classic", name: "Maroon Classic", className: "template-maroon-classic", accent: "#c99b32", category: "Luxury", premium: true },
  { id: "minimal", name: "Minimal White", className: "template-minimal", accent: "#687386", category: "Minimal" },
  { id: "black-blue", name: "Black Blue", className: "template-black-blue", accent: "#1763ee", category: "Professional", premium: true },
  { id: "local", name: "Nature Green", className: "template-local", accent: "#78a939", category: "Creative" },
  { id: "creative-purple", name: "Creative Purple", className: "template-creative-purple", accent: "#8b43dc", category: "Creative" },
  { id: "executive-dark", name: "Executive Dark", className: "template-executive-dark", accent: "#d9a72e", category: "Luxury", premium: true },
  { id: "minimal-orange", name: "Minimal Orange", className: "template-minimal-orange", accent: "#ff6a1a", category: "Minimal" },
  { id: "enterprise-teal", name: "Enterprise Teal", className: "template-enterprise-teal", accent: "#5da899", category: "Professional" },
  { id: "light-elegant", name: "Light Elegant", className: "template-light-elegant", accent: "#536a88", category: "Minimal" },
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

const getBusinessId = (business = {}) =>
  business?._id?.$oid || business?._id || business?.id || business?.businessId || "";

const compact = (...values) =>
  values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
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

const getPhoneNumbers = (business = {}, storedUser = {}) =>
  uniqueValues(
    normalizeList(
      business.contact,
      business.contactList,
      business.whatsappNumber,
      storedUser.mobileNumber1,
      storedUser.mobileNumber2,
      storedUser.contact
    )
  ).slice(0, 2);

const getBusinessProfile = (business = {}, storedUser = {}) => {
  const businessId = getBusinessId(business);
  const districtSlug = createDistrictSlug(business.masterLocation?.district || business.district || "");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://massclick.in";
  const path = businessId
    ? buildBusinessPath({
        districtSlug,
        location: business.location || "business",
        businessName: business.businessName || business.name,
        publicId: business.publicId,
        id: businessId,
      })
    : "/user_edit-profile";
  const profileQrCode = business.businessProfileQrCode || {};
  const legacyProfileQrCode = business.qrCode?.qrText?.includes("/business/")
    ? business.qrCode
    : {};
  const businessUrl = profileQrCode.qrText || legacyProfileQrCode.qrText || `${origin}${path}`;

  return {
    businessId,
    businessName: business.businessName || business.name || storedUser.businessName || "Your Business Name",
    tagLine: business.title || business.category || "Business Services",
    personName: business.name && business.name !== business.businessName
      ? business.name
      : storedUser.userName || storedUser.name || "Business Owner",
    role: business.role || business.designation || "Founder & CEO",
    phones: getPhoneNumbers(business, storedUser),
    email: business.email || storedUser.email || "",
    website: business.website || "massclick.in",
    location: compact(business.globalAddress, business.location) || business.street || "",
    category: business.category || "",
    logoImage: getBusinessLogo(business),
    qrImage: profileQrCode.qrImageData || profileQrCode.qrImage || legacyProfileQrCode.qrImageData || legacyProfileQrCode.qrImage || "",
    qrExportImage: profileQrCode.qrImageData || legacyProfileQrCode.qrImageData || "",
    url: businessUrl,
  };
};

const QrMark = ({ image }) => {
  if (image) {
    return <img className={cx("qr-image")} src={image} alt="Business QR code" />;
  }

  return <span className={cx("qr-missing")}>QR unavailable</span>;
};

const getInitials = (value = "") => {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "M";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
};

const ContactRow = ({ label, value }) => (
  <span className={cx("contact-row")}>
    <span className={cx("contact-icon")}>{label}</span>
    <span>{value}</span>
  </span>
);

const getContactRows = (profile) => [
  ...(profile.phones?.length
    ? profile.phones.map((phone, index) => ({ label: `P${index + 1}`, value: phone }))
    : [{ label: "P", value: "+91 98765 43210" }]),
  { label: "E", value: profile.email || "info@business.com" },
  { label: "W", value: profile.website },
  { label: "L", value: profile.location || "Tamil Nadu" },
  ...(profile.socialLinks?.length
    ? [{ label: "S", value: profile.socialLinks.filter(Boolean).join(" • ") }]
    : []),
].filter((row) => row.value);

const CardPreview = ({ template, profile, size = "normal" }) => (
  <article className={cx("card-shell", template.className, `card-shell-${size}`)}>
    <span className={cx("card-shape card-shape-primary")} />
    <span className={cx("card-shape card-shape-secondary")} />

    <header className={cx("card-brand-row")}>
      <div className={cx("brand-mark")}>
        {profile.logoImage ? (
          <img src={profile.logoImage} alt={`${profile.businessName} logo`} />
        ) : (
          getInitials(profile.businessName)
        )}
      </div>
      <div className={cx("brand-copy")}>
        <h2 className={cx("business-name")}>{profile.businessName}</h2>
        <p className={cx("tag-line")}>{profile.tagLine}</p>
      </div>
    </header>

    <div className={cx("card-person")}>
      <strong>{profile.personName}</strong>
      <span>{profile.role}</span>
    </div>

    <div className={cx("contact-list")}>
      {getContactRows(profile).map((row) => (
        <ContactRow key={`${row.label}-${row.value}`} label={row.label} value={row.value} />
      ))}
    </div>

    <div className={cx("qr-box")}>
      <QrMark image={profile.qrImage} />
    </div>

    <footer className={cx("card-footer-row")}>
      <span className={cx("category-pill")}>{profile.category || "Digital Visiting Card"}</span>
    </footer>
  </article>
);

const svgText = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const limitText = (value = "", max = 44) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trim()}...` : text;
};

const svgLine = (text, x, y, size, color, weight = 500, extra = "") =>
  `<text x="${x}" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}" ${extra}>${svgText(text)}</text>`;

const svgContact = ({ icon, value, x, y, color, accent }) => `
  <circle cx="${x}" cy="${y - 6}" r="14" fill="${accent}" opacity="0.16" />
  ${svgLine(icon, x - 5, y - 1, 13, accent, 800)}
  ${svgLine(limitText(value, 40), x + 28, y, 22, color, 650)}
`;

const svgQrUnavailable = (x, y, accent, muted) => `
  <rect x="${x}" y="${y}" width="156" height="156" rx="22" fill="#ffffff" stroke="${accent}" stroke-width="6" />
  <path d="M${x + 42} ${y + 58} H${x + 114} M${x + 42} ${y + 78} H${x + 114} M${x + 42} ${y + 98} H${x + 114}" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity="0.62" />
  ${svgLine("QR not available", x + 15, y + 184, 18, muted, 700)}
`;

const svgQrImage = (image, x, y, accent, muted) => `
  <rect x="${x}" y="${y}" width="156" height="156" rx="22" fill="#ffffff" stroke="${accent}" stroke-width="6" />
  <image href="${svgText(image)}" x="${x + 16}" y="${y + 16}" width="124" height="124" preserveAspectRatio="xMidYMid meet" />
  ${svgLine("Scan for profile", x - 8, y + 184, 18, muted, 700)}
`;

const svgLogoMark = (profile, x, y, size, fill, textColor) => {
  const logo = profile.logoImage || profile.logoExportImage;
  const radius = Math.round(size / 2);
  const initials = getInitials(profile.businessName);

  if (logo) {
    return `
      <defs>
        <clipPath id="businessLogoClip">
          <circle cx="${x + radius}" cy="${y + radius}" r="${radius}" />
        </clipPath>
      </defs>
      <circle cx="${x + radius}" cy="${y + radius}" r="${radius + 6}" fill="#ffffff" />
      <circle cx="${x + radius}" cy="${y + radius}" r="${radius}" fill="#ffffff" />
      <image href="${svgText(logo)}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" clip-path="url(#businessLogoClip)" />
    `;
  }

  return `
    <circle cx="${x + radius}" cy="${y + radius}" r="${radius}" fill="${fill}" />
    ${svgLine(initials, x + 21, y + 52, 36, textColor, 850)}
  `;
};

const buildCardSvg = (template, profile) => {
  const dark = ["dark", "luxury", "gradient", "minimal-dark", "tech-green", "navy-orange", "maroon-classic", "black-blue", "creative-purple", "executive-dark", "enterprise-teal"].includes(template.id);
  const bg = {
    modern: "#ffffff",
    dark: "#111111",
    massclick: "#fff7ed",
    corporate: "#f7fbff",
    luxury: "#101010",
    gradient: "#355df6",
    "elegant-green": "#ffffff",
    "minimal-dark": "#15191f",
    "classic-red": "#ffffff",
    "wave-blue": "#f7fbff",
    "teal-hexagon": "#ffffff",
    "tech-green": "#11171a",
    "blue-geometry": "#ffffff",
    "pink-elegance": "#fff8fa",
    "navy-orange": "#07162d",
    "classic-beige": "#fff9ed",
    "maroon-classic": "#681015",
    minimal: "#ffffff",
    "black-blue": "#11161d",
    local: "#fffdf6",
    "creative-purple": "#7839cf",
    "executive-dark": "#141414",
    "minimal-orange": "#ffffff",
    "enterprise-teal": "#0b3439",
    "light-elegant": "#ffffff",
  }[template.id] || "#ffffff";
  const text = dark ? "#ffffff" : "#07122f";
  const muted = dark ? "#d6dbe4" : "#4b5f7a";
  const accent = template.accent;
  const panel = dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)";
  const qrX = 842;
  const qrY = 374;
  const qr = profile.qrImage
    ? svgQrImage(profile.qrImage, qrX, qrY, accent, muted)
    : svgQrUnavailable(qrX, qrY, accent, muted);
  const ownerName = limitText(profile.personName, 28);
  const businessName = limitText(profile.businessName, 36);
  const tagLine = limitText(profile.tagLine, 48);
  const category = limitText(profile.category || "Digital Visiting Card", 44);
  const address = limitText(profile.location || "Tamil Nadu", 50);
  const contactRows = getContactRows(profile).slice(0, 5);
  const svgContacts = contactRows
    .map((row, index) => svgContact({
      icon: row.label,
      value: row.label === "L" ? limitText(address, 50) : row.value,
      x: 96,
      y: 366 + (index * 38),
      color: text,
      accent,
    }))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="600" viewBox="0 0 1050 600">
    <rect width="1050" height="600" rx="34" fill="${bg}" />
    <path d="M0 476 C180 418 308 592 512 504 C676 434 748 320 1050 356 L1050 600 L0 600 Z" fill="${accent}" opacity="${dark ? "0.22" : "0.12"}" />
    <path d="M778 0 L1050 0 L1050 206 C968 162 920 92 778 0 Z" fill="${accent}" opacity="${dark ? "0.2" : "0.14"}" />
    ${svgLogoMark(profile, 51, 53, 86, accent, "#ffffff")}
    ${svgLine(businessName, 170, 92, 42, text, 850)}
    ${svgLine(tagLine, 172, 128, 22, muted, 500)}
    <rect x="82" y="186" width="128" height="7" rx="3.5" fill="${accent}" />
    ${svgLine(ownerName, 82, 252, 38, text, 850)}
    ${svgLine(limitText(profile.role || "Founder & CEO", 32), 82, 288, 22, muted, 520)}
    <rect x="82" y="326" width="568" height="1" fill="${dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.09)"}" />
    ${svgContacts}
    <rect x="82" y="532" width="430" height="34" rx="17" fill="${panel}" stroke="${dark ? "rgba(255,255,255,0.13)" : "rgba(15,23,42,0.08)"}" />
    ${svgLine(category, 104, 555, 17, muted, 750)}
    ${qr}
  </svg>`;
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

const createCardPng = async (template, profile) => {
  const embeddedProfile = {
    ...profile,
    qrImage: profile.qrExportImage || "",
    logoImage: await imageToDataUrl(profile.logoImage),
  };

  return new Promise((resolve, reject) => {
    const svg = buildCardSvg(template, embeddedProfile);
    const image = new Image();
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 800;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Unable to create visiting card image."));
      }, "image/png", 0.95);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to render visiting card image."));
    };

    image.src = url;
  });
};

const EditorSection = ({ title, panel, icon, openPanel, setOpenPanel, children }) => (
  <section className={cx("customizer-section")}>
    <button
      type="button"
      className={cx("accordion-trigger")}
      onClick={() => setOpenPanel(openPanel === panel ? "" : panel)}
      aria-expanded={openPanel === panel}
    >
      <span>{icon}{title}</span>
      <ExpandMoreIcon className={cx(openPanel === panel && "accordion-icon-open")} />
    </button>
    {openPanel === panel && children}
  </section>
);

export default function VisitingCardPage() {
  const dispatch = useDispatch();
  const { matchedBusiness, matchedBusinessLoading, matchedBusinessError } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const storedUser = useMemo(readStoredUser, []);
  const mobileNumber = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.contact || "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [statusMessage, setStatusMessage] = useState("");
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [profileEdits, setProfileEdits] = useState({});
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] = useState("All");
  const [openPanel, setOpenPanel] = useState("profile");

  useEffect(() => {
    if (mobileNumber) dispatch(findBusinessByMobile(mobileNumber));
  }, [dispatch, mobileNumber]);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectCatalogueTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };
  const businessProfile = getBusinessProfile(matchedBusiness || {}, storedUser);
  const profile = { ...businessProfile, ...profileEdits };
  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = templateCategory === "All" || template.category === templateCategory;
    const matchesSearch = template.name.toLowerCase().includes(templateSearch.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });
  const updateProfile = (field, value) => setProfileEdits((current) => ({ ...current, [field]: value }));
  const updateListField = (field, index, value) => {
    const currentValues = [...(profile[field] || [])];
    currentValues[index] = value;
    updateProfile(field, currentValues);
  };

  const fileName = `${createSlug(profile.businessName) || "massclick"}-visiting-card.png`;

  const handleDownload = async () => {
    setStatusMessage("");
    try {
      const blob = await createCardPng(selectedTemplate, profile);
      downloadBlob(blob, fileName);
      setStatusMessage("Visiting card downloaded.");
    } catch (error) {
      setStatusMessage(error.message || "Download failed.");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profile.url);
      setStatusMessage("Business profile link copied.");
    } catch {
      setStatusMessage("Copy failed. Please use the share button.");
    }
  };

  const handleCopyDetails = async () => {
    const details = [
      profile.businessName,
      profile.tagLine,
      profile.personName,
      profile.role,
      profile.category ? `Category: ${profile.category}` : "",
      profile.phones?.length ? `Phone: ${profile.phones.join(", ")}` : "",
      profile.email ? `Email: ${profile.email}` : "",
      profile.website ? `Website: ${profile.website}` : "",
      profile.location ? `Address: ${profile.location}` : "",
      profile.socialLinks?.filter(Boolean).length ? `Social: ${profile.socialLinks.filter(Boolean).join(", ")}` : "",
      `Profile: ${profile.url}`,
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setStatusMessage("Business details copied.");
    } catch {
      setStatusMessage("Copy failed. Please try again.");
    }
  };

  const handleShare = async () => {
    setStatusMessage("");
    try {
      const blob = await createCardPng(selectedTemplate, profile);
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: profile.businessName,
          text: `${profile.businessName} digital visiting card`,
          files: [file],
        });
        setStatusMessage("Visiting card shared.");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: profile.businessName,
          text: `${profile.businessName} digital visiting card`,
          url: profile.url,
        });
        setStatusMessage("Business profile shared.");
        return;
      }

      await navigator.clipboard.writeText(profile.url);
      setStatusMessage("Sharing is not supported here, so the link was copied.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatusMessage("Share failed. Try downloading the card instead.");
      }
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

        <section className={cx("studio-layout")}>
          <div className={cx("studio-main")}>
            <section className={cx("identity-hero")}>
              <div className={cx("hero-copy")}>
                <span>Digital Visiting Card</span>
                <h1>Create. Customize. Share.<br />Your Digital Identity</h1>
                <p>Choose a template, customize every detail, and share your professional identity instantly.</p>
              </div>
              <div className={cx("hero-preview")}>
                <span className={cx("hero-callout hero-callout-left")}>Your Details</span>
                <CardPreview template={selectedTemplate} profile={profile} size="thumbnail" />
                <span className={cx("hero-callout hero-callout-right")}>Your Brand</span>
              </div>
              <div className={cx("hero-stats")}>
                <span><strong>120+</strong><small>Premium Templates</small></span>
                <span><strong>25+</strong><small>Themes</small></span>
                <span><strong>10+</strong><small>Card Types</small></span>
                <span><strong>∞</strong><small>Custom Possibilities</small></span>
                <span><strong>1 Click</strong><small>Share Instantly</small></span>
              </div>
            </section>

            <section className={cx("template-browser")}>
              <div className={cx("template-browser-head")}>
                <div className={cx("category-row")}>
                  <strong>Choose a Template</strong>
                  {["All", "Modern", "Minimal", "Professional", "Creative", "Luxury"].map((category) => (
                    <button type="button" key={category} className={cx(templateCategory === category && "category-active")} onClick={() => setTemplateCategory(category)}>{category === "All" ? "All 25" : category}</button>
                  ))}
                </div>
                <label className={cx("template-search")}><SearchIcon /><input value={templateSearch} onChange={(event) => setTemplateSearch(event.target.value)} placeholder="Search templates..." /><TuneIcon /></label>
              </div>
              <div className={cx("studio-template-grid")}>
                {filteredTemplates.map((template) => (
                  <button type="button" key={template.id} className={cx("studio-template", selectedTemplateId === template.id && "studio-template-active")} onClick={() => selectCatalogueTemplate(template.id)}>
                    <CardPreview template={template} profile={profile} size="thumbnail" />
                    <span>{templates.findIndex((item) => item.id === template.id) + 1}. {template.name}{template.premium && <b>♛</b>}</span>
                  </button>
                ))}
              </div>
              {!filteredTemplates.length && <p className={cx("empty-templates")}>No templates match your search.</p>}
            </section>
          </div>

          <aside className={cx("customizer")}>
            <header><strong>Customize Your Card</strong><button type="button" onClick={() => setProfileEdits({})}>↻ Reset</button></header>
            <section className={cx("customizer-section")}>
              <button type="button" className={cx("accordion-trigger")} onClick={() => setOpenPanel(openPanel === "profile" ? "" : "profile")}><span><PersonOutlineIcon /> Profile</span><ExpandMoreIcon /></button>
              {openPanel === "profile" && <div className={cx("profile-fields")}>
                <label>Business Name<input value={profile.businessName} onChange={(event) => updateProfile("businessName", event.target.value)} /></label>
                <label>Full Name<input value={profile.personName} onChange={(event) => updateProfile("personName", event.target.value)} /></label>
                <label>Designation<input value={profile.role} onChange={(event) => updateProfile("role", event.target.value)} /></label>
                <label>Tagline<input value={profile.tagLine} onChange={(event) => updateProfile("tagLine", event.target.value)} /></label>
              </div>}
            </section>
            <EditorSection title="Contact Details" panel="contact" icon={<ContentCopyIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}>
              <div className={cx("profile-fields")}>
                <label>Primary Phone<input type="tel" value={profile.phones?.[0] || ""} onChange={(event) => updateListField("phones", 0, event.target.value)} placeholder="+91 98765 43210" /></label>
                <label>Alternate / WhatsApp<input type="tel" value={profile.phones?.[1] || ""} onChange={(event) => updateListField("phones", 1, event.target.value)} placeholder="Optional second number" /></label>
                <label>Email Address<input type="email" value={profile.email || ""} onChange={(event) => updateProfile("email", event.target.value)} placeholder="name@business.com" /></label>
                <label>Website<input value={profile.website || ""} onChange={(event) => updateProfile("website", event.target.value)} placeholder="www.business.com" /></label>
                <label>Full Business Address<textarea value={profile.location || ""} onChange={(event) => updateProfile("location", event.target.value)} placeholder="Door number, street, area, city, district, state and PIN code" /></label>
              </div>
            </EditorSection>
            <EditorSection title="Social Links" panel="social" icon={<LinkIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}>
              <div className={cx("profile-fields")}>
                <label>LinkedIn<input value={profile.socialLinks?.[0] || ""} onChange={(event) => updateListField("socialLinks", 0, event.target.value)} placeholder="linkedin.com/in/yourname" /></label>
                <label>Instagram<input value={profile.socialLinks?.[1] || ""} onChange={(event) => updateListField("socialLinks", 1, event.target.value)} placeholder="instagram.com/yourbusiness" /></label>
                <label>Facebook<input value={profile.socialLinks?.[2] || ""} onChange={(event) => updateListField("socialLinks", 2, event.target.value)} placeholder="facebook.com/yourbusiness" /></label>
                <label>YouTube / Other<input value={profile.socialLinks?.[3] || ""} onChange={(event) => updateListField("socialLinks", 3, event.target.value)} placeholder="Your channel or social URL" /></label>
              </div>
            </EditorSection>
            <EditorSection title="Branding" panel="branding" icon={<PaletteIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}>
              <div className={cx("profile-fields")}>
                <label>Logo Image URL<input value={profile.logoImage || ""} onChange={(event) => updateProfile("logoImage", event.target.value)} placeholder="https://.../logo.png" /></label>
                <label>Business Category<input value={profile.category || ""} onChange={(event) => updateProfile("category", event.target.value)} placeholder="e.g. Sports Academy" /></label>
              </div>
            </EditorSection>
            <EditorSection title="Design Settings" panel="design" icon={<BrushIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}>
              <div className={cx("design-options")}>
                {templates.map((template) => <button type="button" key={template.id} className={cx(selectedTemplateId === template.id && "design-option-active")} onClick={() => setSelectedTemplateId(template.id)}><i style={{ background: template.accent }} />{template.name}</button>)}
              </div>
            </EditorSection>
            <EditorSection title="QR Code Settings" panel="qr" icon={<QrCode2Icon />} openPanel={openPanel} setOpenPanel={setOpenPanel}>
              <div className={cx("profile-fields")}>
                <label>Profile / QR Destination URL<input value={profile.url || ""} onChange={(event) => updateProfile("url", event.target.value)} placeholder="https://massclick.in/business/..." /></label>
                <label>QR Image URL<input value={profile.qrImage || ""} onChange={(event) => { updateProfile("qrImage", event.target.value); updateProfile("qrExportImage", event.target.value); }} placeholder="https://.../qr-code.png" /></label>
                <button type="button" className={cx("field-button")} onClick={handleCopyLink}>Copy profile link</button>
              </div>
            </EditorSection>
            <EditorSection title="Advanced Settings" panel="advanced" icon={<SettingsOutlinedIcon />} openPanel={openPanel} setOpenPanel={setOpenPanel}>
              <div className={cx("profile-fields")}>
                <label>Card Label<input value={profile.category || ""} onChange={(event) => updateProfile("category", event.target.value)} placeholder="Digital Visiting Card" /></label>
                <button type="button" className={cx("field-button")} onClick={() => setProfileEdits({})}>Restore saved business details</button>
              </div>
            </EditorSection>
            <div className={cx("customizer-actions")}>
              <button type="button" className={cx("save-preview")} onClick={handleDownload}><DownloadIcon /> Save & Download Card</button>
              <button type="button" onClick={handleShare}><ShareIcon /> Share Card</button>
              <button type="button" onClick={handleCopyDetails}><ContentCopyIcon /> Copy Details</button>
            </div>
            {statusMessage && <p className={cx("status-message")}>{statusMessage}</p>}
          </aside>
        </section>

        {isDesignModalOpen && (
          <div className={cx("document-modal-overlay")} role="presentation">
            <section className={cx("document-modal")} role="dialog" aria-modal="true" aria-labelledby="visiting-card-design-title">
              <header className={cx("document-modal-header")}>
                <div>
                  <span>Digital Visiting Card</span>
                  <h2 id="visiting-card-design-title">Choose Template</h2>
                </div>
                <button type="button" className={cx("icon-action")} onClick={() => setIsDesignModalOpen(false)} aria-label="Close design settings">
                  <CloseIcon />
                </button>
              </header>

              <div className={cx("document-modal-body")}>
                {matchedBusinessLoading ? (
                  <div className={cx("loading-box")}>Loading your business card details...</div>
                ) : (
                  <div className={cx("template-grid")}>
                    {templates.map((template, index) => (
                      <button
                        type="button"
                        key={template.id}
                        className={cx(
                          "template-option",
                          selectedTemplateId === template.id && "template-option-active"
                        )}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <CardPreview template={template} profile={profile} size="thumbnail" />
                        <span className={cx("template-label")}>{index + 1}. {template.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
