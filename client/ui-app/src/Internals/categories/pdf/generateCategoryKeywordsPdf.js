import { jsPDF } from "jspdf";

const COLORS = {
  ink: [15, 23, 42],
  navy: [21, 35, 56],
  orange: [247, 104, 14],
  orangeDark: [194, 65, 12],
  orangeSoft: [255, 247, 237],
  slate: [71, 85, 105],
  muted: [100, 116, 139],
  surface: [248, 250, 252],
  border: [226, 232, 240],
  white: [255, 255, 255],
};

const normalizeKeywords = (keywords) =>
  (Array.isArray(keywords) ? keywords : String(keywords || "").split(","))
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);

const formatExportDate = () =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

const safeFileDate = () => new Date().toISOString().slice(0, 10);

export const generateCategoryKeywordsPdf = (categories = []) => {
  const normalizedCategories = categories
    .filter((category) => category?.category)
    .map((category) => ({
      name: String(category.category).trim(),
      keywords: normalizeKeywords(category.keywords),
    }))
    .sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
    );

  const totalKeywords = normalizedCategories.reduce(
    (total, category) => total + category.keywords.length,
    0,
  );
  const averageKeywords = normalizedCategories.length
    ? Math.round(totalKeywords / normalizedCategories.length)
    : 0;
  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const contentTop = 35;
  const contentBottom = pageHeight - 19;
  let pageNumber = 1;
  let y = contentTop;

  pdf.setProperties({
    title: "Massclick Category & Keyword Directory",
    subject: "Complete category and keyword directory",
    author: "Massclick",
    creator: "Massclick Admin",
    keywords: "Massclick, categories, keywords, directory",
  });

  const drawBrandMark = (x, markY, compact = false) => {
    const size = compact ? 7 : 10;
    pdf.setFillColor(...COLORS.orange);
    pdf.roundedRect(x, markY, size, size, compact ? 1.6 : 2.2, compact ? 1.6 : 2.2, "F");
    pdf.setTextColor(...COLORS.white);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(compact ? 6.5 : 9);
    pdf.text("M", x + size / 2, markY + size * 0.69, { align: "center" });
  };

  const drawDirectoryPage = () => {
    pdf.setFillColor(...COLORS.white);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(0, 0, pageWidth, 4, "F");

    drawBrandMark(margin, 13, true);
    pdf.setTextColor(...COLORS.ink);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("MASSCLICK", margin + 10, 18);
    pdf.setTextColor(...COLORS.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text("CATEGORY & KEYWORD DIRECTORY", pageWidth - margin, 18, {
      align: "right",
    });

    pdf.setDrawColor(...COLORS.border);
    pdf.setLineWidth(0.25);
    pdf.line(margin, 26, pageWidth - margin, 26);
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    pdf.setTextColor(...COLORS.muted);
    pdf.setFontSize(7);
    pdf.text(`${normalizedCategories.length} categories  /  ${totalKeywords} keywords`, margin, pageHeight - 8);
    pdf.text(`MASSCLICK  •  ${String(pageNumber).padStart(2, "0")}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
    y = contentTop;
  };

  const addDirectoryPage = () => {
    pdf.addPage();
    pageNumber += 1;
    drawDirectoryPage();
  };

  // Cover page
  pdf.setFillColor(...COLORS.surface);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(0, 0, pageWidth, 92, "F");
  pdf.setFillColor(...COLORS.orange);
  pdf.rect(0, 0, 5, 92, "F");
  drawBrandMark(margin, 18);
  pdf.setTextColor(...COLORS.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("MASSCLICK", margin + 14, 25);
  pdf.setTextColor(203, 213, 225);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("BUSINESS DISCOVERY PLATFORM", margin + 14, 30.5);

  pdf.setTextColor(...COLORS.white);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(25);
  pdf.text("Category & Keyword", margin, 55);
  pdf.setTextColor(...COLORS.orange);
  pdf.text("Directory", margin, 66);
  pdf.setTextColor(203, 213, 225);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("A structured SEO reference for the complete Massclick category library.", margin, 78);

  pdf.setTextColor(...COLORS.orangeDark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("DIRECTORY OVERVIEW", margin, 115);

  const metrics = [
    { value: normalizedCategories.length, label: "CATEGORIES" },
    { value: totalKeywords, label: "KEYWORDS" },
    { value: averageKeywords, label: "AVG. PER CATEGORY" },
  ];
  const metricGap = 5;
  const metricWidth = (contentWidth - metricGap * 2) / 3;
  metrics.forEach((metric, index) => {
    const x = margin + index * (metricWidth + metricGap);
    pdf.setFillColor(...COLORS.white);
    pdf.setDrawColor(...COLORS.border);
    pdf.roundedRect(x, 122, metricWidth, 30, 3, 3, "FD");
    pdf.setFillColor(...COLORS.orangeSoft);
    pdf.circle(x + 9, 133, 4.2, "F");
    pdf.setTextColor(...COLORS.ink);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(Number(metric.value).toLocaleString("en-IN"), x + 17, 136);
    pdf.setTextColor(...COLORS.muted);
    pdf.setFontSize(6.5);
    pdf.text(metric.label, x + 5, 146);
  });

  pdf.setFillColor(...COLORS.white);
  pdf.setDrawColor(...COLORS.border);
  pdf.roundedRect(margin, 168, contentWidth, 46, 3, 3, "FD");
  pdf.setFillColor(...COLORS.orange);
  pdf.roundedRect(margin, 168, 3, 46, 1.5, 1.5, "F");
  pdf.setTextColor(...COLORS.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Built for quick reference", margin + 10, 181);
  pdf.setTextColor(...COLORS.slate);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  const intro = pdf.splitTextToSize(
    "Categories are sorted alphabetically, with keyword totals and search terms grouped into clean, scan-friendly sections.",
    contentWidth - 20,
  );
  pdf.text(intro, margin + 10, 190, { lineHeightFactor: 1.45 });

  pdf.setTextColor(...COLORS.muted);
  pdf.setFontSize(7.5);
  pdf.text("PREPARED BY", margin, 246);
  pdf.setTextColor(...COLORS.ink);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("Massclick Technologies", margin, 253);
  pdf.setTextColor(...COLORS.muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text(`Generated ${formatExportDate()}`, pageWidth - margin, 253, { align: "right" });
  pdf.setFillColor(...COLORS.orange);
  pdf.rect(margin, 268, 26, 1.5, "F");
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(margin + 26, 268, contentWidth - 26, 1.5, "F");

  addDirectoryPage();
  let currentLetter = "";

  normalizedCategories.forEach((category, categoryIndex) => {
    const letter = (category.name.charAt(0).match(/[a-z]/i)?.[0] || "#").toUpperCase();
    const keywordText = category.keywords.length
      ? category.keywords.join("  •  ")
      : "No keywords available";

    const badgeText = `${category.keywords.length} keyword${category.keywords.length === 1 ? "" : "s"}`;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    const badgeWidth = pdf.getTextWidth(badgeText) + 8;
    pdf.setFontSize(10.5);
    const titleLines = pdf.splitTextToSize(
      category.name,
      contentWidth - badgeWidth - 28,
    );
    const titleAreaHeight = Math.max(12, titleLines.length * 4.7 + 3);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const keywordLines = pdf.splitTextToSize(keywordText, contentWidth - 14);
    const blockHeight = titleAreaHeight + 5 + keywordLines.length * 4.15;
    const needsLetter = letter !== currentLetter;
    const requiredHeight = blockHeight + (needsLetter ? 14 : 0);

    if (y + requiredHeight > contentBottom) addDirectoryPage();

    if (needsLetter) {
      currentLetter = letter;
      pdf.setFillColor(...COLORS.navy);
      pdf.roundedRect(margin, y, 9, 9, 2, 2, "F");
      pdf.setTextColor(...COLORS.white);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text(letter, margin + 4.5, y + 6.2, { align: "center" });
      pdf.setTextColor(...COLORS.muted);
      pdf.setFontSize(6.5);
      pdf.text(`SECTION ${letter}`, margin + 13, y + 6);
      pdf.setDrawColor(...COLORS.border);
      pdf.line(margin + 32, y + 4.5, pageWidth - margin, y + 4.5);
      y += 14;
    }

    pdf.setFillColor(...COLORS.white);
    pdf.setDrawColor(...COLORS.border);
    pdf.roundedRect(margin, y, contentWidth, blockHeight, 2.5, 2.5, "FD");
    pdf.setFillColor(...COLORS.orangeSoft);
    pdf.roundedRect(margin + 3.5, y + 4, 8, 8, 2, 2, "F");
    pdf.setTextColor(...COLORS.orangeDark);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.text(String(categoryIndex + 1).padStart(2, "0"), margin + 7.5, y + 9.2, {
      align: "center",
    });

    pdf.setTextColor(...COLORS.ink);
    pdf.setFontSize(10.5);
    pdf.text(titleLines, margin + 15, y + 8.5, { lineHeightFactor: 1.15 });

    pdf.setFontSize(7);
    const badgeX = pageWidth - margin - badgeWidth - 4;
    pdf.setFillColor(...COLORS.surface);
    pdf.setDrawColor(...COLORS.border);
    pdf.roundedRect(badgeX, y + 4, badgeWidth, 8, 4, 4, "FD");
    pdf.setTextColor(...COLORS.slate);
    pdf.text(badgeText, badgeX + badgeWidth / 2, y + 9.2, { align: "center" });

    pdf.setTextColor(...COLORS.slate);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(keywordLines, margin + 7, y + titleAreaHeight + 4, {
      lineHeightFactor: 1.3,
    });
    y += blockHeight + 3;
  });

  const pageCount = pdf.getNumberOfPages();
  for (let index = 2; index <= pageCount; index += 1) {
    pdf.setPage(index);
    pdf.setTextColor(...COLORS.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(`${index - 1} / ${pageCount - 1}`, pageWidth / 2, pageHeight - 8, {
      align: "center",
    });
  }

  pdf.save(`massclick-category-keyword-directory-${safeFileDate()}.pdf`);
};
