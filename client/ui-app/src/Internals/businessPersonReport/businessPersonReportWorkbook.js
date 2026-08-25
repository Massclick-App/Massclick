const COLORS = { navy: "FF102A43", orange: "FFEA6D11", pale: "FFFFF3E8", white: "FFFFFFFF", line: "FFD8E1EA", stripe: "FFF8FAFC", ink: "FF172033" };

const styleHeader = (row) => row.eachCell((cell) => {
  cell.font = { bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } };
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
});

const addTable = (sheet, title, headers, rows, widths) => {
  const start = sheet.rowCount + 2;
  sheet.mergeCells(start, 1, start, headers.length);
  const titleCell = sheet.getCell(start, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.orange } };
  const headerRow = sheet.getRow(start + 1);
  headerRow.values = headers;
  styleHeader(headerRow);
  rows.forEach((values, index) => {
    const row = sheet.getRow(start + 2 + index);
    row.values = values;
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: index % 2 ? COLORS.stripe : COLORS.white } };
      cell.border = { bottom: { style: "thin", color: { argb: COLORS.line } } };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  });
  if (!rows.length) sheet.getCell(start + 2, 1).value = "No records for the selected period";
  widths.forEach((width, i) => { sheet.getColumn(i + 1).width = Math.max(sheet.getColumn(i + 1).width || 0, width); });
  sheet.autoFilter = { from: { row: start + 1, column: 1 }, to: { row: start + 1 + Math.max(rows.length, 1), column: headers.length } };
};

export async function exportBusinessPersonReport(report) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MassClick";
  workbook.title = "Business Person Report";
  const sheet = workbook.addWorksheet("Complete Report", { views: [{ state: "frozen", ySplit: 8, showGridLines: false }] });
  sheet.mergeCells("A1:H1");
  Object.assign(sheet.getCell("A1"), { value: "MASSCLICK BUSINESS PERSON REPORT", font: { size: 22, bold: true, color: { argb: COLORS.white } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } }, alignment: { vertical: "middle" } });
  sheet.getRow(1).height = 38;
  const info = [
    ["Person", report.person.name, "Business", report.person.businessName, "Mobile", report.person.mobile, "Category", report.person.category],
    ["Period", `${report.range.from} to ${report.range.to}`, "Location", report.person.location, "Email", report.person.email, "Generated", new Date(report.generatedAt).toLocaleString("en-IN")],
  ];
  info.forEach((values, index) => { const row = sheet.getRow(index + 3); row.values = values; row.eachCell((cell, col) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.pale } }; cell.font = { bold: col % 2 === 1, color: { argb: COLORS.ink } }; cell.alignment = { wrapText: true }; }); });
  const m = report.metrics;
  addTable(sheet, "Performance Summary", ["Metric", "Count", "Metric", "Count"], [
    ["Category searches", m.categorySearches, "Unique category searchers", m.categorySearchers],
    ["Business visits", m.businessVisits, "Unique business visitors", m.uniqueBusinessVisitors],
    ["Call clicks", m.calls, "WhatsApp clicks", m.whatsappClicks],
    ["Enquiries", m.enquiries, "Total interaction leads", m.interactionLeads],
    ["Business leads sent", m.businessLeadsSent ?? m.publicLeadsSent, "Business lead attempts", m.businessLeadsAttempted ?? m.publicLeadsAttempted],
    ["Customer leads sent", m.customerLeadsSent ?? 0, "Customer lead messages", m.customerLeadsAttempted ?? 0],
    ["All successful lead messages", m.publicLeadsSent, "Failed lead deliveries", m.publicLeadsFailed],
    ["Excluded unrelated audit rows", m.excludedUnrelatedLeadAudits ?? 0, "Scope validation", "Business + category + district"],
    ["Directions", m.directions, "Number reveals", m.numberReveals],
  ], [30, 16, 30, 16]);
  addTable(sheet, "Linked Businesses", ["Business", "Category", "Subcategory", "Location", "Contact", "WhatsApp", "Live"], report.businesses.map((r) => [r.name, r.category, r.subcategory, r.location, r.contact, r.whatsapp, r.live ? "Yes" : "No"]), [32, 24, 22, 24, 18, 18, 10]);
  addTable(sheet, "Daily Performance", ["Date", "Visits", "Unique visitors", "Calls", "WhatsApp", "Enquiries"], report.daily.map((r) => [r.date, r.visits, r.uniqueVisitors, r.calls, r.whatsapp, r.enquiries]), [16, 14, 18, 12, 14, 14]);
  addTable(sheet, "Category Search Details", ["Query", "Location", "Searches", "Unique visitors", "First search", "Last search"], report.categorySearches.map((r) => [r.query, r.location, r.searches, r.uniqueVisitors, r.firstAt ? new Date(r.firstAt) : "", r.lastAt ? new Date(r.lastAt) : ""]), [34, 24, 14, 18, 22, 22]);
  addTable(sheet, "Business Leads — Customer Details Sent to Business", ["Date", "Status", "Customer", "Customer mobile", "Category", "Location", "Business", "Business recipient", "Source", "Failure reason"], (report.businessLeadDeliveries || report.leadDeliveries || []).map((r) => [new Date(r.date), r.status, r.customerName, r.customerMobile, r.category, r.location, r.businessName, r.recipientMobile, r.source, r.failureReason]), [22, 14, 24, 18, 24, 22, 28, 20, 18, 30]);
  addTable(sheet, "Customer Leads — Business Details Sent to Customer", ["Date", "Status", "Customer", "Customer mobile", "Category", "Location", "Selected business", "Customer recipient", "Source", "Failure reason"], (report.customerLeadDeliveries || []).map((r) => [new Date(r.date), r.status, r.customerName, r.customerMobile, r.category, r.location, r.businessName, r.recipientMobile, r.source, r.failureReason]), [22, 14, 24, 18, 24, 22, 28, 20, 18, 30]);
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  sheet.headerFooter.oddFooter = "&LMassClick&CPage &P of &N&RBusiness Person Report";
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MassClick_Business_Person_${(report.person.name || report.person.mobile).replace(/[^a-z0-9]+/gi, "_")}_${report.range.from}_${report.range.to}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
