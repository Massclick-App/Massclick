import { jsPDF } from "jspdf";
import massclickLogo from "../../assets/mclogo.webp";

const REQUIRED = "Required";
const OPTIONAL = "Optional";
const IF_APPLICABLE = "If applicable";

const sections = [
  {
    number: "01",
    title: "Business profile",
    subtitle: "Core information about the business",
    fields: [
      { name: "Business Name", status: REQUIRED },
      { name: "Experience", status: REQUIRED },
      { name: "Business Details", status: REQUIRED },
      { name: "Category", status: REQUIRED },
      { name: "Keywords", status: REQUIRED },
    ],
  },
  {
    number: "02",
    title: "Address & location",
    subtitle: "Where customers can find the business",
    fields: [
      {
        name: "Address",
        status: REQUIRED,
        note: "Includes plot / door / shop number, street, taluk, PIN code and district",
      },
      { name: "Google Maps Link", status: REQUIRED },
      { name: "Latitude & Longitude", status: REQUIRED },
    ],
  },
  {
    number: "03",
    title: "Contact & digital",
    subtitle: "How customers connect with the business",
    fields: [
      { name: "WhatsApp Number", status: REQUIRED },
      { name: "Official Contact Number", status: REQUIRED },
      { name: "Website", status: OPTIONAL },
      { name: "Social Media Links", status: OPTIONAL },
    ],
  },
  {
    number: "04",
    title: "Operations & verification",
    subtitle: "Assets, availability and documents",
    fields: [
      { name: "Office Front / Banner Image", status: REQUIRED },
      { name: "Business Logo", status: REQUIRED },
      { name: "Opening Hours (Monday to Sunday)", status: REQUIRED },
      { name: "GSTIN Number", status: IF_APPLICABLE },
      { name: "KYC Documents", status: REQUIRED },
    ],
  },
];

const COLORS = {
  ink: [20, 31, 49],
  navy: [16, 42, 76],
  orange: [238, 102, 19],
  muted: [92, 105, 124],
  border: [218, 224, 232],
  soft: [247, 249, 252],
  white: [255, 255, 255],
  green: [24, 126, 82],
  blue: [47, 91, 180],
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
  const margin = 15;
  const gap = 8;
  const columnWidth = (pageWidth - (margin * 2) - gap) / 2;

  const fill = color => doc.setFillColor(...color);
  const text = color => doc.setTextColor(...color);

  fill(COLORS.white);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Minimal editorial header.
  fill(COLORS.orange);
  doc.rect(0, 0, pageWidth, 3, "F");

  const logoWidth = 40;
  const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
  doc.addImage(logo, "WEBP", margin, 12, logoWidth, logoHeight, undefined, "FAST");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  text(COLORS.ink);
  doc.text("Business information", margin, 37);
  doc.text("checklist", margin, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  text(COLORS.muted);
  doc.text("Everything required to create a complete and accurate business listing.", margin, 54);

  const metaX = pageWidth - margin - 51;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  text(COLORS.orange);
  doc.text("DOCUMENT", metaX, 17);
  doc.setFontSize(10);
  text(COLORS.ink);
  doc.text("Business onboarding", metaX, 23);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  text(COLORS.muted);
  doc.text("17 fields  /  1 page  /  A4", metaX, 29);

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.4);
  doc.line(margin, 61, pageWidth - margin, 61);

  const drawStatus = (status, rightX, centerY) => {
    const statusColor = status === REQUIRED
      ? COLORS.orange
      : status === OPTIONAL
        ? COLORS.green
        : COLORS.blue;

    fill(statusColor);
    doc.circle(rightX - 2.2, centerY - 0.8, 1.15, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    text(statusColor);
    doc.text(status.toUpperCase(), rightX - 5, centerY, { align: "right" });
  };

  const drawSection = (section, x, top) => {
    const headerHeight = 21;
    const standardRowHeight = 15.5;
    const noteRowHeight = 23;
    const bodyHeight = section.fields.reduce(
      (total, field) => total + (field.note ? noteRowHeight : standardRowHeight),
      0
    );
    const sectionHeight = headerHeight + bodyHeight;

    fill(COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.45);
    doc.roundedRect(x, top, columnWidth, sectionHeight, 2.2, 2.2, "FD");

    fill(COLORS.soft);
    doc.roundedRect(x, top, columnWidth, headerHeight, 2.2, 2.2, "F");
    fill(COLORS.orange);
    doc.rect(x, top, 2.2, headerHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    text(COLORS.orange);
    doc.text(section.number, x + 7, top + 7);

    doc.setFontSize(12.5);
    text(COLORS.ink);
    doc.text(section.title, x + 7, top + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    text(COLORS.muted);
    doc.text(section.subtitle, x + 7, top + 18);

    let rowY = top + headerHeight;
    section.fields.forEach((field, index) => {
      const rowHeight = field.note ? noteRowHeight : standardRowHeight;
      if (index > 0) {
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.25);
        doc.line(x + 6, rowY, x + columnWidth - 6, rowY);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(field.name.length > 30 ? 9.5 : 10.5);
      text(COLORS.ink);
      doc.text(field.name, x + 7, rowY + 6.4);
      drawStatus(
        field.status,
        x + columnWidth - 5,
        field.note ? rowY + 19.2 : rowY + 12.2
      );

      if (field.note) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        text(COLORS.muted);
        doc.text(
          doc.splitTextToSize(field.note, columnWidth - 14),
          x + 7,
          rowY + 13
        );
      }

      rowY += rowHeight;
    });

    return sectionHeight;
  };

  const contentTop = 69;
  const leftHeight = drawSection(sections[0], margin, contentTop);
  drawSection(sections[1], margin, contentTop + leftHeight + gap);

  const rightX = margin + columnWidth + gap;
  const rightHeight = drawSection(sections[2], rightX, contentTop);
  drawSection(sections[3], rightX, contentTop + rightHeight + gap);

  // Clear reading key and document footer.
  fill(COLORS.navy);
  doc.roundedRect(margin, 265, pageWidth - (margin * 2), 17, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  text(COLORS.white);
  doc.text("STATUS KEY", margin + 6, 271.5);

  const keyItems = [
    { label: "Required", detail: "must be provided", color: COLORS.orange, x: margin + 39 },
    { label: "Optional", detail: "when available", color: COLORS.green, x: margin + 92 },
    { label: "If applicable", detail: "when relevant", color: COLORS.blue, x: margin + 140 },
  ];

  keyItems.forEach(item => {
    fill(item.color);
    doc.circle(item.x, 270, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    text(COLORS.white);
    doc.text(item.label, item.x + 3, 271);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(199, 211, 226);
    doc.text(item.detail, item.x + 3, 276);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  text(COLORS.muted);
  doc.text("Massclick Business Listing", margin, pageHeight - 7);
  doc.text("Clear information helps us publish your listing faster.", pageWidth - margin, pageHeight - 7, { align: "right" });

  doc.save("Massclick-Business-Information-Checklist.pdf");
};
