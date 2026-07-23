// Excel export for the Site Analytics dashboard. Mirrors the styling language
// of unifiedAnalytics/analyticsWorkbook.js so the two reports feel like one
// product: a navy report header, blue table headers, zebra striping, frozen
// panes, and auto-filters. Every sheet reflects the filters active on screen.

const C = {
  navy: "FF102A43",
  blue: "FF2563EB",
  orange: "FFF97316",
  pale: "FFEFF6FF",
  white: "FFFFFFFF",
  ink: "FF172033",
  muted: "FF667085",
  line: "FFD9E2EC",
  stripe: "FFF8FAFC",
  green: "FF16803C",
  purple: "FF7C3AED",
};

const border = {
  top: { style: "thin", color: { argb: C.line } },
  left: { style: "thin", color: { argb: C.line } },
  bottom: { style: "thin", color: { argb: C.line } },
  right: { style: "thin", color: { argb: C.line } },
};

const num = (value) => Number(value || 0);
const list = (value) => (Array.isArray(value) ? value : []);

function reportHeader(sheet, { title, subtitle, columns, meta, filters = [] }) {
  sheet.mergeCells(1, 1, 1, columns);
  Object.assign(sheet.getCell(1, 1), {
    value: title,
    font: { name: "Aptos Display", size: 22, bold: true, color: { argb: C.white } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } },
    alignment: { vertical: "middle", horizontal: "left" },
  });
  sheet.getRow(1).height = 38;

  sheet.mergeCells(2, 1, 2, columns);
  Object.assign(sheet.getCell(2, 1), {
    value: subtitle,
    font: { name: "Aptos", size: 10, color: { argb: C.muted } },
    alignment: { vertical: "middle", wrapText: true },
  });
  sheet.getRow(2).height = 26;

  const metaCells = [
    [1, "PERIOD"],
    [2, meta.rangeLabel],
    [3, "GENERATED"],
    [4, meta.generated],
    [5, "SOURCE"],
    [6, "First-party tracker"],
  ].filter(([col]) => col <= columns);
  metaCells.forEach(([col, value]) => (sheet.getCell(3, col).value = value));
  sheet.getRow(3).eachCell((cell, column) => {
    cell.font = { name: "Aptos", size: 9, bold: column % 2 === 1, color: { argb: column % 2 === 1 ? C.blue : C.ink } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.pale } };
    cell.alignment = { vertical: "middle", horizontal: column % 2 === 1 ? "center" : "left" };
    cell.border = border;
  });
  sheet.getRow(3).height = 24;

  if (filters.length > 0) {
    let col = 1;
    filters.forEach(({ label, value }) => {
      if (col > columns) return;
      sheet.getCell(4, col).value = String(label).toUpperCase();
      sheet.getCell(4, Math.min(col + 1, columns)).value = value;
      col += 2;
    });
    sheet.getRow(4).eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 9, bold: column % 2 === 1, color: { argb: column % 2 === 1 ? C.blue : C.ink } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.stripe } };
      cell.alignment = { vertical: "middle", horizontal: column % 2 === 1 ? "center" : "left" };
      cell.border = border;
    });
    sheet.getRow(4).height = 22;
  }
}

function styleTable(sheet, headerRow, endRow, numericColumns, accent = C.blue) {
  sheet.getRow(headerRow).eachCell((cell) => {
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: accent } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  });
  sheet.getRow(headerRow).height = 25;
  for (let r = headerRow + 1; r <= endRow; r += 1) {
    sheet.getRow(r).eachCell((cell, column) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: C.ink } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: r % 2 === 0 ? C.stripe : C.white } };
      cell.alignment = { vertical: "middle", horizontal: numericColumns.includes(column) ? "right" : "left" };
      cell.border = border;
      if (numericColumns.includes(column)) cell.numFmt = "#,##0";
    });
  }
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: endRow, column: sheet.getRow(headerRow).cellCount } };
  sheet.views = [{ state: "frozen", ySplit: headerRow, showGridLines: false }];
}

// A standard detail sheet: report header, then a styled, filtered, frozen table.
function detailSheet(workbook, { name, color, title, subtitle, meta, filters, headers, widths, numeric, data, map }) {
  const sheet = workbook.addWorksheet(name, { properties: { tabColor: { argb: color || C.blue } } });
  const headerBlock = filters.length ? 4 : 3;
  reportHeader(sheet, { title, subtitle, columns: headers.length, meta, filters });

  const headerRow = headerBlock + 1;
  sheet.getRow(headerRow).values = headers;
  const rows = list(data);
  rows.forEach((item, index) => (sheet.getRow(headerRow + 1 + index).values = map(item, index)));
  if (!rows.length) {
    sheet.mergeCells(headerRow + 1, 1, headerRow + 1, headers.length);
    const cell = sheet.getCell(headerRow + 1, 1);
    cell.value = "No data was available for the selected filters.";
    cell.font = { italic: true, color: { argb: C.muted } };
    cell.alignment = { horizontal: "center" };
  }
  styleTable(sheet, headerRow, headerRow + Math.max(rows.length, 1), numeric, color || C.blue);
  widths.forEach((width, index) => (sheet.getColumn(index + 1).width = width));
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
  sheet.headerFooter.oddFooter = `&LMassClick Site Analytics&CPage &P of &N&R${name}`;
  return sheet;
}

function overviewSheet(workbook, { overview, meta, filters }) {
  const sheet = workbook.addWorksheet("Overview", { properties: { tabColor: { argb: C.orange } } });
  reportHeader(sheet, {
    title: "MassClick Site Analytics — Overview",
    subtitle: "First-party visitor engagement for the selected window, compared against the immediately preceding equal-length period.",
    columns: 4,
    meta,
    filters,
  });

  const current = overview?.current || {};
  const previous = overview?.previous || {};
  const delta = (now, before) => {
    const a = num(now);
    const b = num(before);
    if (!b) return a ? "New" : "—";
    return `${Math.round(((a - b) / b) * 100)}%`;
  };

  const metrics = [
    ["Unique visitors", "visitors"],
    ["Sessions", "sessions"],
    ["Page views", "pageViews"],
    ["Pages / session", "pagesPerSession"],
    ["Logged-in customers", "identifiedUsers"],
    ["Business views", "businessViews"],
    ["Interactions", "interactions"],
    ["Searches", "searches"],
    ["Result clicks", "resultClicks"],
  ];

  const headerRow = filters.length ? 5 : 4;
  sheet.getRow(headerRow).values = ["Metric", "This period", "Previous", "Change"];
  metrics.forEach(([label, key], index) => {
    sheet.getRow(headerRow + 1 + index).values = [label, num(current[key]), num(previous[key]), delta(current[key], previous[key])];
  });
  styleTable(sheet, headerRow, headerRow + metrics.length, [2, 3, 4], C.orange);
  // The change column is text, not a count.
  for (let r = headerRow + 1; r <= headerRow + metrics.length; r += 1) sheet.getCell(r, 4).numFmt = "General";
  [34, 16, 16, 14].forEach((width, index) => (sheet.getColumn(index + 1).width = width));
  sheet.pageSetup = { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
  sheet.headerFooter.oddFooter = "&LMassClick Site Analytics&CConfidential · Page &P of &N&ROverview";
}

const DEVICE_LABELS = { mobile: "Mobile", tablet: "Tablet", desktop: "Desktop", other: "Other" };

export async function exportSiteAnalyticsWorkbook({ overview, trends, devices, pages, businesses, searches, meta, filters = [] }) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  Object.assign(workbook, {
    creator: "MassClick Site Analytics",
    company: "MassClick",
    subject: `Site analytics — ${meta.rangeLabel}`,
    title: "MassClick Site Analytics",
    created: new Date(),
    modified: new Date(),
  });
  workbook.calcProperties.fullCalcOnLoad = true;

  overviewSheet(workbook, { overview, meta, filters });

  detailSheet(workbook, {
    name: "Daily Traffic",
    color: C.purple,
    title: "Daily Traffic",
    subtitle: "Per-day visitors, sessions, page views, business clicks, and searches (IST).",
    meta,
    filters,
    headers: ["Date", "Visitors", "Sessions", "Page views", "Business clicks", "Searches"],
    widths: [16, 14, 14, 14, 18, 14],
    numeric: [2, 3, 4, 5, 6],
    data: trends,
    map: (r) => [r.date, num(r.visitors), num(r.sessions), num(r.pageViews), num(r.businessClicks), num(r.searches)],
  });

  detailSheet(workbook, {
    name: "Top Pages",
    color: C.blue,
    title: "Top Pages",
    subtitle: "Most viewed pages in the selected window, with the number of sessions that reached them.",
    meta,
    filters,
    headers: ["Rank", "Path", "Views", "Sessions"],
    widths: [10, 60, 14, 14],
    numeric: [1, 3, 4],
    data: pages,
    map: (r, i) => [i + 1, r.path || "/", num(r.views), num(r.sessions)],
  });

  detailSheet(workbook, {
    name: "Top Businesses",
    color: C.green,
    title: "Top Businesses",
    subtitle: "Listing views with the interaction and lead breakdown per business.",
    meta,
    filters,
    headers: ["Rank", "Business", "Views", "Clicks", "Leads", "Calls", "WhatsApp", "Directions", "Enquiries", "Number reveals"],
    widths: [8, 40, 12, 12, 12, 12, 14, 14, 14, 16],
    numeric: [1, 3, 4, 5, 6, 7, 8, 9, 10],
    data: businesses,
    map: (r, i) => {
      const a = r.actions || {};
      return [i + 1, r.name || r.businessId, num(r.views), num(r.clicks), num(r.leads), num(a.call), num(a.whatsapp), num(a.direction), num(a.enquiry), num(a.showNumber)];
    },
  });

  detailSheet(workbook, {
    name: "Top Searches",
    color: C.orange,
    title: "Top Searches",
    subtitle: "Search queries by volume, with typed share, average result counts, and no-result occurrences.",
    meta,
    filters,
    headers: ["Rank", "Query", "Searches", "Typed", "Avg results", "Zero results", "Top location"],
    widths: [8, 40, 14, 12, 14, 14, 24],
    numeric: [1, 3, 4, 5, 6],
    data: searches,
    map: (r, i) => [i + 1, r.query, num(r.count), num(r.typedCount), num(r.avgResults), num(r.zeroResults), r.location || "—"],
  });

  detailSheet(workbook, {
    name: "Devices",
    color: C.purple,
    title: "Devices & Browsers",
    subtitle: "Unique visitors split by device type and browser.",
    meta,
    filters,
    headers: ["Type", "Value", "Visitors"],
    widths: [16, 28, 14],
    numeric: [3],
    data: [
      ...list(devices?.devices).map((r) => ({ type: "Device", value: DEVICE_LABELS[r.device] || r.device || "Other", visitors: r.visitors })),
      ...list(devices?.browsers).map((r) => ({ type: "Browser", value: r.browser || "Other", visitors: r.visitors })),
    ],
    map: (r) => [r.type, r.value, num(r.visitors)],
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MassClick_SiteAnalytics_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
