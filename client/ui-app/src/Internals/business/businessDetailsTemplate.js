import { jsPDF } from "jspdf";
import massclickLogo from "../../assets/mclogo.webp";

const REQUIRED = "Required";
const OPTIONAL = "Optional";
const IF_APPLICABLE = "If applicable";

const fields = [
  { name: "Business Name", status: REQUIRED },
  { name: "Experience", status: REQUIRED },
  {
    name: "Business Details",
    status: REQUIRED,
    note: "Overall business overview, experience, services and completed works.",
  },
  { name: "Category", status: REQUIRED },
  { name: "Keywords", status: OPTIONAL },
  { name: "WhatsApp Number", status: REQUIRED },
  { name: "Official Contact Number", status: REQUIRED },
  { name: "Website", status: REQUIRED },
  {
    name: "Social Media Links",
    status: REQUIRED,
    note: "WhatsApp Group, Facebook, Instagram, X, YouTube, LinkedIn, etc.",
  },
  {
    name: "Address",
    status: REQUIRED,
    note: "Plot / door / shop number, street, taluk, PIN code and district.",
  },
  { name: "Google Maps Link", status: IF_APPLICABLE },
  { name: "Latitude & Longitude", status: IF_APPLICABLE },
  {
    name: "Banner Image",
    status: REQUIRED,
    note: "A clear, recent image of the office or business front.",
  },
  { name: "Business Logo", status: REQUIRED },
  { name: "Opening Hours", status: REQUIRED },
  { name: "GST Number", status: REQUIRED },
  {
    name: "KYC Documents",
    status: REQUIRED,
    note: "GST certificate or business licence, and Aadhaar card or other ID proof.",
  },
];

const COLORS = {
  navy: [10, 35, 70],
  blue: [30, 92, 167],
  orange: [239, 103, 20],
  green: [22, 126, 82],
  ink: [18, 31, 50],
  muted: [83, 99, 119],
  border: [211, 222, 235],
  paleOrange: [255, 246, 239],
  white: [255, 255, 255],
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const columnGap = 7;
  const columnWidth = (pageWidth - (margin * 2) - columnGap) / 2;

  const fill = color => doc.setFillColor(...color);
  const text = color => doc.setTextColor(...color);

  fill(COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Branded document header.
  fill(COLORS.navy);
  doc.rect(0, 0, pageWidth, 54, "F");
  fill(COLORS.orange);
  doc.rect(0, 0, pageWidth, 3, "F");

  const logoWidth = 42;
  const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
  fill(COLORS.white);
  doc.roundedRect(margin, 10, 48, 16, 2, 2, "F");
  doc.addImage(logo, "WEBP", margin + 3, 12, logoWidth, logoHeight, undefined, "FAST");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(23);
  text(COLORS.white);
  doc.text("Business Information Checklist", margin, 37);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(208, 220, 236);
  doc.text(
    "Please provide clear and accurate information for every item marked Required.",
    margin,
    45
  );

  fill(COLORS.orange);
  doc.roundedRect(pageWidth - margin - 39, 11, 39, 11, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  text(COLORS.white);
  doc.text("17 INFORMATION ITEMS", pageWidth - margin - 19.5, 17.8, { align: "center" });

  const statusStyle = status => {
    if (status === REQUIRED) {
      return { color: COLORS.orange, background: COLORS.paleOrange };
    }
    if (status === OPTIONAL) {
      return { color: COLORS.green, background: [235, 248, 241] };
    }
    return { color: COLORS.blue, background: [235, 242, 252] };
  };

  const rowHeight = field => field.note ? 27 : 18;

  const drawField = (field, number, x, y) => {
    const height = rowHeight(field);
    const style = statusStyle(field.status);

    fill(COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.45);
    doc.roundedRect(x, y, columnWidth, height - 2, 2.4, 2.4, "FD");

    fill(number % 2 === 0 ? COLORS.blue : COLORS.navy);
    doc.circle(x + 8, y + 7.5, 4.4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    text(COLORS.white);
    doc.text(String(number), x + 8, y + 8.6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(field.name.length > 23 ? 10.8 : 11.8);
    text(COLORS.ink);
    doc.text(field.name, x + 15.5, y + 7.8);

    const badgeWidth = field.status === IF_APPLICABLE ? 22 : 17;
    fill(style.background);
    doc.roundedRect(
      x + columnWidth - badgeWidth - 4,
      y + height - 8,
      badgeWidth,
      4.8,
      1.4,
      1.4,
      "F"
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    text(style.color);
    doc.text(
      field.status.toUpperCase(),
      x + columnWidth - 4 - (badgeWidth / 2),
      y + height - 4.6,
      { align: "center" }
    );

    if (field.note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      text(COLORS.muted);
      const noteWidth = columnWidth - 22;
      doc.text(doc.splitTextToSize(field.note, noteWidth), x + 15.5, y + 13);
    }

    return height;
  };

  const contentTop = 60;
  const leftFields = fields.slice(0, 9);
  const rightFields = fields.slice(9);
  let leftY = contentTop;
  let rightY = contentTop;

  leftFields.forEach((field, index) => {
    leftY += drawField(field, index + 1, margin, leftY);
  });

  rightFields.forEach((field, index) => {
    rightY += drawField(
      field,
      index + 10,
      margin + columnWidth + columnGap,
      rightY
    );
  });

  // Prominent support panel and compact status key.
  const footerY = 243;
  fill(COLORS.navy);
  doc.roundedRect(margin, footerY, pageWidth - (margin * 2), 39, 3, 3, "F");
  fill(COLORS.orange);
  doc.roundedRect(margin, footerY, 3, 39, 3, 3, "F");
  doc.rect(margin + 1.5, footerY, 2, 39, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  text(COLORS.white);
  doc.text("Need help completing this checklist?", margin + 8, footerY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(211, 224, 240);
  doc.text(
    "For questions about required information, accepted documents or submitting",
    margin + 8,
    footerY + 14
  );
  doc.text(
    "your business listing, please call or WhatsApp our support team.",
    margin + 8,
    footerY + 18.5
  );

  const phoneCardY = footerY + 22;
  const phoneCardWidth = 52;
  const drawPhoneCard = (x, number, label) => {
    fill(COLORS.white);
    doc.roundedRect(x, phoneCardY, phoneCardWidth, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    text(COLORS.orange);
    doc.text(label, x + 4, phoneCardY + 4.2);
    doc.setFontSize(13);
    text(COLORS.navy);
    doc.text(number, x + 4, phoneCardY + 9.5);
  };

  drawPhoneCard(margin + 8, "97891 04201", "CALL / WHATSAPP");
  drawPhoneCard(margin + 64, "93423 28981", "CALL / WHATSAPP");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  text(COLORS.white);
  doc.text("CHECKLIST STATUS", pageWidth - margin - 45, footerY + 25);
  const keyItems = [
    { label: "Required", color: COLORS.orange },
    { label: "Optional", color: COLORS.green },
    { label: "If applicable", color: COLORS.blue },
  ];
  keyItems.forEach((item, index) => {
    const keyY = footerY + 29 + (index * 4);
    fill(item.color);
    doc.circle(pageWidth - margin - 43.5, keyY - 0.8, 1.1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    text(COLORS.white);
    doc.text(item.label, pageWidth - margin - 40, keyY);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  text(COLORS.muted);
  doc.text("Massclick Business Listing", margin, pageHeight - 7);
  doc.text(
    "Complete information helps us publish your business listing faster.",
    pageWidth - margin,
    pageHeight - 7,
    { align: "right" }
  );

  doc.save("Massclick-Business-Information-Checklist.pdf");
};
