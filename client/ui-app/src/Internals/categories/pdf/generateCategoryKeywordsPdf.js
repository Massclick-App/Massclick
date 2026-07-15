import { jsPDF } from "jspdf";

const COLORS = {
  orange: [245, 103, 15],
  navy: [18, 32, 52],
  muted: [100, 116, 139],
  surface: [248, 250, 252],
  border: [226, 232, 240],
  white: [255, 255, 255],
};

const normalizeKeywords = (keywords) =>
  (Array.isArray(keywords) ? keywords : String(keywords || "").split(","))
    .map((keyword) => keyword.trim())
    .filter(Boolean);

export const generateCategoryKeywordsPdf = (categories) => {
  const normalizedCategories = categories
    .filter((category) => category?.category)
    .map((category) => ({
      name: String(category.category).trim(),
      keywords: normalizeKeywords(category.keywords),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentTop = 31;
  const contentBottom = pageHeight - 17;
  const contentWidth = pageWidth - margin * 2;
  const cardPadding = 5;
  const titleLineHeight = 5.5;
  const keywordLineHeight = 4.1;
  const itemGap = 3;
  let pageNumber = 1;
  let y = contentTop;

  const drawPage = () => {
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(0, 0, pageWidth, 8, "F");
    pdf.setFillColor(...COLORS.orange);
    pdf.rect(0, 8, pageWidth, 1.5, "F");
    pdf.setTextColor(...COLORS.navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("MASSCLICK", margin, 20);
    pdf.setTextColor(...COLORS.orange);
    pdf.text("CATEGORY & KEYWORD DIRECTORY", pageWidth - margin, 20, {
      align: "right",
    });
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.25);
    pdf.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    pdf.setTextColor(...COLORS.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(
      `${normalizedCategories.length} CATEGORIES`,
      margin,
      pageHeight - 8,
    );
    pdf.text(`PAGE ${pageNumber}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
    y = contentTop;
  };

  const addPage = () => {
    pdf.addPage();
    pageNumber += 1;
    drawPage();
  };

  drawPage();

  normalizedCategories.forEach((category) => {
    const keywordText = category.keywords.length
      ? category.keywords.join(", ")
      : "No keywords available";

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    const titleLines = pdf.splitTextToSize(category.name, contentWidth - 48);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    const keywordLines = pdf.splitTextToSize(keywordText, contentWidth - 24);
    const titleHeight = titleLines.length * titleLineHeight;
    const keywordsHeight = keywordLines.length * keywordLineHeight;
    const itemHeight =
      cardPadding + titleHeight + 7 + keywordsHeight + cardPadding;

    if (y + itemHeight > contentBottom) addPage();

    pdf.setFillColor(...COLORS.white);
    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentWidth, itemHeight, 1.2, 1.2, "FD");

    pdf.setFillColor(...COLORS.orange);
    pdf.roundedRect(margin, y, 2.2, itemHeight, 1.1, 1.1, "F");

    const textX = margin + 8;
    const titleY = y + cardPadding + 4;
    pdf.setTextColor(...COLORS.navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(titleLines, textX, titleY, {
      lineHeightFactor: 1.25,
    });

    const keywordCount = category.keywords.length;
    const badgeText = `${keywordCount} KEYWORD${keywordCount === 1 ? "" : "S"}`;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    const badgeWidth = Math.max(23, pdf.getTextWidth(badgeText) + 7);
    const badgeX = pageWidth - margin - cardPadding - badgeWidth;
    pdf.setFillColor(255, 247, 237);
    pdf.setDrawColor(254, 215, 170);
    pdf.roundedRect(badgeX, y + cardPadding - 1, badgeWidth, 7, 3.5, 3.5, "FD");
    pdf.setTextColor(...COLORS.orange);
    pdf.text(badgeText, badgeX + badgeWidth / 2, y + cardPadding + 3.7, {
      align: "center",
    });

    const labelY = y + cardPadding + titleHeight + 4.5;
    pdf.setTextColor(...COLORS.orange);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text("KEYWORDS", textX, labelY);
    pdf.setDrawColor(254, 215, 170);
    pdf.line(
      textX + 15,
      labelY - 0.7,
      pageWidth - margin - cardPadding,
      labelY - 0.7,
    );

    pdf.setTextColor(...COLORS.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text(keywordLines, textX, labelY + 5, {
      lineHeightFactor: 1.28,
    });

    y += itemHeight + itemGap;
  });

  pdf.save("all-categories-keywords.pdf");
};
