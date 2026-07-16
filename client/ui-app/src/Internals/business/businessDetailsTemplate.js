import jsPDF from "jspdf";
import massclickLogo from "../../assets/MassClick_pvt_ltd.webp";

const REQUIRED = "REQUIRED";
const IF_AVAILABLE = "IF AVAILABLE";
const CONDITIONAL = "IF APPLICABLE";

const requirements = [
  { number: 1, title: "Business Name", status: REQUIRED, group: "Business identity", guidance: "Provide the exact public or registered name. Keep spelling and capitalization consistent across your documents, storefront, website and social profiles.", example: "Kumar Electricals" },
  { number: 2, title: "Plot Number", status: REQUIRED, group: "Address", guidance: "Mention the door, shop, building or plot number. Include floor or unit number when relevant.", example: "Shop 12A, First Floor" },
  { number: 3, title: "Street", status: REQUIRED, group: "Address", guidance: "Provide the street or road name together with the area or a useful nearby landmark.", example: "Gandhi Road, opposite City Library" },
  { number: 4, title: "Taluk", status: REQUIRED, group: "Address", guidance: "Provide the official taluk or sub-district used in the postal address.", example: "Mylapore Taluk" },
  { number: 5, title: "Pincode", status: REQUIRED, group: "Address", guidance: "Provide a valid six-digit Indian postal PIN code matching the business location.", example: "600004" },
  { number: 6, title: "District", status: REQUIRED, group: "Address", guidance: "Provide the official district name. Do not use the neighbourhood or landmark in this field.", example: "Chennai District" },
  { number: 7, title: "WhatsApp & Official Number", status: REQUIRED, group: "Contact", guidance: "Share both numbers with country code. Clearly identify which number receives WhatsApp messages and which is the main customer-facing call number. They may be the same.", example: "WhatsApp: +91 98765 43210 | Official: +91 98765 43210" },
  { number: 8, title: "GSTIN Number", status: CONDITIONAL, group: "Compliance", guidance: "Provide the active 15-character GSTIN exactly as shown on the certificate. If the business is not GST registered, write 'Not registered'.", example: "22AAAAA0000A1Z5" },
  { number: 9, title: "Experience", status: REQUIRED, group: "Business profile", guidance: "Provide the number of completed years in operation. You may also mention the year the business was established.", example: "8 years | Established in 2018" },
  { number: 10, title: "Google Maps Link", status: REQUIRED, group: "Location", guidance: "Open the correct business pin in Google Maps, choose Share, and copy the public link. Confirm that the pin opens at the office or shop entrance.", example: "https://maps.google.com/?q=13.0827,80.2707" },
  { number: 11, title: "Latitude & Longitude", status: REQUIRED, group: "Location", critical: true, guidance: "Both coordinates are mandatory. Copy them from the confirmed map pin. Latitude must be between -90 and 90; longitude must be between -180 and 180. Keep at least four decimal places.", example: "Latitude: 13.0827 | Longitude: 80.2707" },
  { number: 12, title: "Website", status: IF_AVAILABLE, group: "Digital presence", guidance: "Share the complete official website URL beginning with https://. Do not send a search-results link.", example: "https://www.kumarelectricals.in" },
  { number: 13, title: "Social Media Links", status: IF_AVAILABLE, group: "Digital presence", guidance: "Share the full public profile link for each available platform: Facebook, Instagram, YouTube, Pinterest, Twitter/X and LinkedIn. Write 'Not available' beside platforms not used.", example: "Instagram: https://instagram.com/kumarelectricals" },
  { number: 14, title: "Banner Image — Office Front", status: REQUIRED, group: "Media", guidance: "Send a recent landscape photo of the actual office or storefront. The name board should be readable, the entrance unobstructed and the image free of watermarks or heavy filters.", example: "JPG/PNG | Landscape | Recommended 1600 x 900 px | Under 5 MB" },
  { number: 15, title: "Business Logo", status: REQUIRED, group: "Media", guidance: "Send the original logo on a clean background. A transparent PNG is preferred. Avoid screenshots, photographs of printed material and logos with excess empty space.", example: "PNG/SVG | Square 1:1 | Recommended 1000 x 1000 px" },
  { number: 16, title: "Business Details", status: REQUIRED, group: "Business profile", guidance: "Write a clear overview covering primary services or products, customer types, service locations and the main reason customers choose the business. Avoid all-capital text and unsupported claims.", example: "Kumar Electricals provides residential and commercial wiring, inverter installation and emergency repair services across Chennai." },
  { number: 17, title: "Opening Hours — Monday to Sunday", status: REQUIRED, group: "Availability", guidance: "Give opening and closing time for every day from Monday through Sunday. Mark a day as Closed or Open 24 Hours where applicable, and mention split shifts clearly.", example: "Mon-Sat: 9:00 AM-7:00 PM | Sunday: Closed" },
  { number: 18, title: "KYC Documents", status: REQUIRED, group: "Compliance", guidance: "Share clear, uncropped copies of the GST certificate and Aadhaar requested for verification. All text and document edges must be visible. Use a password-free PDF or high-resolution image.", example: "GST-certificate.pdf + Aadhaar.pdf | PDF/JPG/PNG | Under 5 MB each" },
  { number: 19, title: "Category", status: REQUIRED, group: "Discovery", guidance: "Choose the single closest primary business category. Add a secondary category only when it represents a significant service.", example: "Primary: Electrician | Secondary: Inverter Dealer" },
  { number: 20, title: "Keywords", status: REQUIRED, group: "Discovery", guidance: "Provide focused phrases customers genuinely use to find the business. Include important services, products and service areas; avoid repeating the business name.", example: "electrician in Chennai, house wiring, inverter repair, emergency electrician" },
];

const COLORS = {
  // Primary brand colors
  navy: [12, 28, 57],
  slate: [71, 85, 105],
  slateLight: [102, 115, 133],
  lightSlate: [226, 232, 240],
  paper: [245, 247, 250],
  white: [255, 255, 255],

  // Primary accent
  orange: [255, 107, 29],
  orangeDark: [204, 74, 10],
  orangeLight: [255, 121, 45],
  orangeSoft: [254, 248, 242],

  // Secondary accents
  green: [34, 110, 62],
  greenDark: [22, 101, 52],
  greenSoft: [232, 248, 242],
  blue: [37, 88, 207],
  blueDark: [30, 64, 175],
  blueSoft: [224, 239, 255],

  // Neutrals
  gray100: [245, 247, 250],
  gray200: [226, 232, 240],
  gray300: [203, 213, 225],
  gray400: [148, 163, 184],
  gray500: [120, 135, 155],
  gray600: [71, 85, 105],
  gray700: [51, 65, 85],
  gray800: [30, 41, 59],
};

const loadImage = source => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error("Unable to load the Massclick logo."));
  image.src = source;
});

export const downloadBusinessDetailsTemplate = async () => {
  const logo = await loadImage(massclickLogo);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = width - margin * 2;
  let y = 0;

  const fill = color => doc.setFillColor(...color);
  const textColor = color => doc.setTextColor(...color);

  const drawBrandLogo = (x, top, logoWidth = 40) => {
    const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
    doc.addImage(logo, "PNG", x, top, logoWidth, logoHeight, undefined, "FAST");
    return logoHeight;
  };

  const statusStyle = status => {
    if (status === REQUIRED) return { bg: COLORS.orangeSoft, fg: COLORS.orangeDark };
    if (status === CONDITIONAL) return { bg: COLORS.blueSoft, fg: COLORS.blueDark };
    return { bg: COLORS.greenSoft, fg: COLORS.greenDark };
  };

  const drawRequirement = (item, x, top, itemWidth) => {

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const guidanceLines = doc.splitTextToSize(item.guidance, itemWidth - 16);
    const cardHeight = Math.max(21.5, 10 + guidanceLines.length * 2.8);

    // Card background
    fill(COLORS.white);
    doc.setDrawColor(...(item.critical ? COLORS.orange : COLORS.gray200));
    doc.setLineWidth(item.critical ? 0.8 : 0.3);
    doc.roundedRect(x, top, itemWidth, cardHeight, 2, 2, "FD");

    // Number circle (smaller)
    fill(item.critical ? COLORS.orange : COLORS.navy);
    doc.circle(x + 5, top + 5.5, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    textColor(COLORS.white);
    doc.text(String(item.number).padStart(2, "0"), x + 5, top + 6.7, { align: "center" });

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    textColor(COLORS.navy);
    doc.text(item.title, x + 10, top + 4.8);

    // Status badge (compact)
    const badge = statusStyle(item.status);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5);
    const badgeWidth = doc.getTextWidth(item.status) + 4;
    fill(badge.bg);
    doc.roundedRect(x + itemWidth - badgeWidth - 1.5, top + 1.5, badgeWidth, 4, 1, 1, "F");
    textColor(badge.fg);
    doc.text(item.status, x + itemWidth - badgeWidth / 2 - 1.5, top + 3.9, { align: "center" });

    // Guidance text (compact)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    textColor(COLORS.gray700);
    doc.text(guidanceLines, x + 3, top + 10);

    return cardHeight;
  };

  // ===== PAGE 1: HEADER + INSTRUCTIONS =====
  fill(COLORS.paper);
  doc.rect(0, 0, width, height, "F");

  // Top accent bar
  fill(COLORS.orange);
  doc.rect(0, 0, width, 3.5, "F");

  // Header section
  fill(COLORS.white);
  doc.rect(0, 0, width, 22, "F");
  drawBrandLogo(margin, 2, 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  textColor(COLORS.navy);
  doc.text("BUSINESS INFORMATION GUIDE", width / 2, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.gray400);
  doc.text("20-Point Onboarding Checklist for Professional Listing", width / 2, 17, { align: "center" });

  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.4);
  doc.line(margin, 20, width - margin, 20);

  // Legend
  y = 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  textColor(COLORS.navy);
  doc.text("Status Legend:", margin, y);
  y += 5;

  // Required badge
  fill(COLORS.orangeSoft);
  doc.roundedRect(margin, y - 2, 6, 4, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  textColor(COLORS.orangeDark);
  doc.text("R", margin + 3, y + 0.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.navy);
  doc.text("REQUIRED - Must provide", margin + 8, y);
  y += 5;

  // Conditional badge
  fill(COLORS.blueSoft);
  doc.roundedRect(margin, y - 2, 6, 4, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  textColor(COLORS.blueDark);
  doc.text("C", margin + 3, y + 0.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.navy);
  doc.text("CONDITIONAL - When applicable", margin + 8, y);
  y += 5;

  // Available badge
  fill(COLORS.greenSoft);
  doc.roundedRect(margin, y - 2, 6, 4, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  textColor(COLORS.greenDark);
  doc.text("O", margin + 3, y + 0.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.navy);
  doc.text("OPTIONAL - If available", margin + 8, y);
  y += 6;

  // Instructions box
  fill(COLORS.navy);
  doc.roundedRect(margin, y, usableWidth, 28, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  textColor(COLORS.white);
  doc.text("How to Use This Guide", margin + 4, y + 4);
  fill(COLORS.orange);
  doc.rect(margin + 4, y + 6, 50, 0.4, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.gray300);
  const instructions = [
    "1. Review all 20 requirements listed on page 2",
    "2. Provide information exactly as specified",
    "3. Send clear, original documents and images",
    "4. Mark items as 'Not applicable' if not relevant",
    "5. Check accuracy before final submission"
  ];
  let instY = y + 9;
  instructions.forEach(line => {
    doc.text(line, margin + 4, instY);
    instY += 3.2;
  });

  y += 32;

  // Key requirements section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  textColor(COLORS.navy);
  doc.text("Key Points:", margin, y);
  y += 3;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.gray700);
  const keyPoints = [
    "✓ Use exact business information from official records",
    "✓ Provide full URLs, not screenshots of links",
    "✓ All images must be clear and original",
    "✓ Documents must show all edges clearly"
  ];
  keyPoints.forEach(point => {
    doc.text(point, margin + 1, y);
    y += 3;
  });

  // Introduction
  y += 2;
  fill(COLORS.white);
  doc.setDrawColor(...COLORS.gray200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, usableWidth, 31, 2, 2, "FD");
  fill(COLORS.orange);
  doc.roundedRect(margin, y, 3, 31, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  textColor(COLORS.navy);
  doc.text("Welcome to Your Business Listing Journey", margin + 7, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  textColor(COLORS.gray700);
  const introduction = doc.splitTextToSize(
    "This guide helps Massclick create an accurate, trustworthy and professional business profile for you. Complete every relevant point on page 2 so customers can easily discover, contact and understand your business.",
    usableWidth - 14
  );
  doc.text(introduction, margin + 7, y + 13);
  fill(COLORS.orangeSoft);
  doc.roundedRect(margin + 7, y + 23, usableWidth - 14, 5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  textColor(COLORS.orangeDark);
  doc.text("Complete information builds customer confidence and helps prevent publishing delays.", width / 2, y + 26.3, { align: "center" });

  // Preparation cards
  y += 37;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  textColor(COLORS.navy);
  doc.text("Prepare Before You Start", margin, y);
  y += 4;
  const preparationCards = [
    { number: "01", title: "Verify your details", body: "Keep the registered name, complete address, contact numbers and opening hours ready." },
    { number: "02", title: "Collect digital assets", body: "Prepare the original logo, storefront image, website, map and social profile links." },
    { number: "03", title: "Check documents", body: "Use clear, current and uncropped files. Confirm that every number and edge is visible." }
  ];
  const prepGap = 3;
  const prepWidth = (usableWidth - prepGap * 2) / 3;
  preparationCards.forEach((card, index) => {
    const cardX = margin + index * (prepWidth + prepGap);
    fill(COLORS.white);
    doc.setDrawColor(...COLORS.gray200);
    doc.roundedRect(cardX, y, prepWidth, 31, 2, 2, "FD");
    fill(COLORS.navy);
    doc.circle(cardX + 6, y + 7, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    textColor(COLORS.white);
    doc.text(card.number, cardX + 6, y + 8, { align: "center" });
    doc.setFontSize(7.3);
    textColor(COLORS.navy);
    doc.text(card.title, cardX + 12, y + 7.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    textColor(COLORS.gray700);
    doc.text(doc.splitTextToSize(card.body, prepWidth - 8), cardX + 4, y + 14);
  });

  // Accuracy and privacy awareness
  y += 37;
  fill(COLORS.navy);
  doc.roundedRect(margin, y, usableWidth, 35, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  textColor(COLORS.white);
  doc.text("Accuracy, Safety & Privacy Awareness", margin + 5, y + 7);
  fill(COLORS.orange);
  doc.rect(margin + 5, y + 9, 58, 0.5, "F");
  const awarenessItems = [
    "Confirm phone numbers and map coordinates before sending.",
    "Share only documents requested for legitimate verification.",
    "Do not add passwords, OTPs or private banking information.",
    "Tell the Massclick team promptly when business details change."
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.7);
  awarenessItems.forEach((item, index) => {
    const itemX = margin + 6 + (index % 2) * (usableWidth / 2 - 2);
    const itemY = y + 16 + Math.floor(index / 2) * 8;
    fill(COLORS.orange);
    doc.circle(itemX, itemY - 0.8, 0.7, "F");
    textColor(COLORS.gray200);
    doc.text(doc.splitTextToSize(item, usableWidth / 2 - 14), itemX + 3, itemY);
  });

  // Submission workflow
  y += 41;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  textColor(COLORS.navy);
  doc.text("What Happens Next", margin, y);
  y += 4;
  const workflow = [
    ["1", "COLLECT", "Gather all details"],
    ["2", "REVIEW", "Check for accuracy"],
    ["3", "SUBMIT", "Send complete files"],
    ["4", "PUBLISH", "Listing goes live"]
  ];
  const stepWidth = usableWidth / 4;
  workflow.forEach(([number, title, detail], index) => {
    const centerX = margin + stepWidth * index + stepWidth / 2;
    if (index < workflow.length - 1) {
      doc.setDrawColor(...COLORS.orange);
      doc.setLineWidth(0.5);
      doc.line(centerX + 7, y + 7, centerX + stepWidth - 7, y + 7);
    }
    fill(index === workflow.length - 1 ? COLORS.orange : COLORS.navy);
    doc.circle(centerX, y + 7, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    textColor(COLORS.white);
    doc.text(number, centerX, y + 8.3, { align: "center" });
    doc.setFontSize(6.8);
    textColor(COLORS.navy);
    doc.text(title, centerX, y + 17, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.1);
    textColor(COLORS.gray600);
    doc.text(detail, centerX, y + 21, { align: "center" });
  });

  y += 27;
  fill(COLORS.orangeSoft);
  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, y, usableWidth, 17, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  textColor(COLORS.orangeDark);
  doc.text("READY TO BEGIN?", margin + 5, y + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  textColor(COLORS.gray700);
  doc.text("Turn to page 2, complete all applicable points, and submit the information together in one organized response.", margin + 5, y + 12);

  // Footer for page 1
  doc.setDrawColor(...COLORS.gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, height - 10, width - margin, height - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.gray400);
  doc.text("See page 2 for all 20 requirements", margin, height - 5);
  doc.text("Page 1", width - margin, height - 5, { align: "right" });

  // ===== PAGE 2: ALL 20 REQUIREMENTS =====
  doc.addPage();
  fill(COLORS.paper);
  doc.rect(0, 0, width, height, "F");

  // Top accent bar
  fill(COLORS.orange);
  doc.rect(0, 0, width, 3.5, "F");

  // Header
  fill(COLORS.white);
  doc.rect(0, 0, width, 20, "F");
  drawBrandLogo(margin, 2, 35);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  textColor(COLORS.navy);
  doc.text("20-POINT REQUIREMENTS", width / 2, 12, { align: "center" });

  doc.setDrawColor(...COLORS.orange);
  doc.setLineWidth(0.4);
  doc.line(margin, 18, width - margin, 18);

  // Two balanced columns keep all 20 requirements on page 2.
  const columnGap = 4;
  const columnWidth = (usableWidth - columnGap) / 2;
  const columnX = [margin, margin + columnWidth + columnGap];

  [requirements.slice(0, 10), requirements.slice(10)].forEach((column, columnIndex) => {
    let cardY = 22;
    column.forEach((req) => {
      cardY += drawRequirement(req, columnX[columnIndex], cardY, columnWidth) + 1.5;
    });
  });

  // Footer for page 2
  doc.setDrawColor(...COLORS.gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, height - 10, width - margin, height - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  textColor(COLORS.gray400);
  doc.text("BUSINESS INFORMATION GUIDE", margin, height - 5);
  doc.text("Page 2", width - margin, height - 5, { align: "right" });

  doc.save("Massclick-Premium-Business-Information-Guide.pdf");
};
