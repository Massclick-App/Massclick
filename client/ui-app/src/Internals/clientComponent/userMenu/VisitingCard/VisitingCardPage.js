import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import { findBusinessByMobile } from "../../../../redux/actions/businessListAction";
import BusinessDocumentsNav from "./BusinessDocumentsNav";
import styles from "./VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);

const templates = [
  { id: "modern", name: "Modern Professional", className: "template-modern", accent: "#0b67d8" },
  { id: "dark", name: "Dark Premium", className: "template-dark", accent: "#d9ad3a" },
  { id: "massclick", name: "Orange MassClick", className: "template-massclick", accent: "#f97316" },
  { id: "corporate", name: "Corporate Blue", className: "template-corporate", accent: "#154aa3" },
  { id: "luxury", name: "Luxury Gold", className: "template-luxury", accent: "#c7972e" },
  { id: "gradient", name: "Creative Gradient", className: "template-gradient", accent: "#4f46e5" },
  { id: "vertical", name: "Vertical Card", className: "template-vertical", accent: "#0f3555" },
  { id: "minimal", name: "Minimal White", className: "template-minimal", accent: "#2563eb" },
  { id: "tech", name: "Tech Startup", className: "template-tech", accent: "#06b6d4" },
  { id: "local", name: "Local Business", className: "template-local", accent: "#4f7d3b" },
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
  const locationSlug = createSlug(business.location || "business");
  const businessSlug = createSlug(business.slug || business.businessName || business.name || "profile");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://massclick.in";
  const path = businessId
    ? `/business/${locationSlug}/${businessSlug}/${businessId}`
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
].filter((row) => row.value);

const CardPreview = ({ template, profile, size = "normal" }) => (
  <article className={cx("card-shell", template.className, `card-shell-${size}`)}>
    <span className={cx("card-shape card-shape-primary")} />
    <span className={cx("card-shape card-shape-secondary")} />

    <header className={cx("card-brand-row")}>
      <div className={cx("brand-mark")}>{getInitials(profile.businessName)}</div>
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

const buildCardSvg = (template, profile) => {
  const dark = ["dark", "luxury", "gradient", "tech"].includes(template.id);
  const bg = {
    modern: "#ffffff",
    dark: "#111111",
    massclick: "#fff7ed",
    corporate: "#f7fbff",
    luxury: "#101010",
    gradient: "#355df6",
    vertical: "#ffffff",
    minimal: "#ffffff",
    tech: "#031426",
    local: "#fffdf6",
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
  const initials = getInitials(profile.businessName);
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
    ${template.id === "vertical" ? `<rect x="0" y="0" width="126" height="600" fill="${accent}" />` : ""}
    <circle cx="94" cy="96" r="43" fill="${template.id === "vertical" ? "#ffffff" : accent}" />
    ${svgLine(initials, 72, 112, 36, template.id === "vertical" ? accent : "#ffffff", 850)}
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

export default function VisitingCardPage() {
  const dispatch = useDispatch();
  const { matchedBusiness, matchedBusinessLoading, matchedBusinessError } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const storedUser = useMemo(readStoredUser, []);
  const mobileNumber = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.contact || "";
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (mobileNumber) dispatch(findBusinessByMobile(mobileNumber));
  }, [dispatch, mobileNumber]);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const profile = getBusinessProfile(matchedBusiness || {}, storedUser);

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
        <section className={cx("page-header")}>
          <BusinessDocumentsNav />
          <span>Digital Visiting Card</span>
          <h1>Select Your Business Card Template</h1>
          <p>Choose a template, preview your card, then download or share it digitally.</p>
        </section>

        {!mobileNumber && (
          <div className={cx("notice-box")}>Login mobile number was not found. Please log in again.</div>
        )}

        {matchedBusinessError && (
          <div className={cx("notice-box")}>{matchedBusinessError}</div>
        )}

        <section className={cx("workspace")}>
          <div className={cx("template-panel")}>
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

          <aside className={cx("preview-panel")}>
            <div className={cx("preview-header")}>
              <div>
                <span>Selected Template</span>
                <h2>{selectedTemplate.name}</h2>
              </div>
            </div>

            <CardPreview template={selectedTemplate} profile={profile} />

            <div className={cx("action-row")}>
              <button type="button" className={cx("primary-action")} onClick={handleDownload}>
                <DownloadIcon />
                Download PNG
              </button>
              <button type="button" className={cx("secondary-action")} onClick={handleShare}>
                <ShareIcon />
                Share
              </button>
              <button type="button" className={cx("icon-action")} onClick={handleCopyLink} aria-label="Copy business profile link">
                <ContentCopyIcon />
              </button>
            </div>

            {statusMessage && <p className={cx("status-message")}>{statusMessage}</p>}
          </aside>
        </section>
      </main>
      <Footer />
    </>
  );
}
