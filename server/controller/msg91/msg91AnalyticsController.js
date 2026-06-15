import mongoose from "mongoose";
import { deflateRawSync } from "zlib";
import businessListModel from "../../model/businessList/businessListModel.js";
import whatsappMessageAuditModel from "../../model/msg91Model/whatsappMessageAuditModel.js";
import whatsappRecipientHealthModel from "../../model/msg91Model/whatsappRecipientHealthModel.js";
import { updateWhatsAppDeliveryStatus } from "../../helper/msg91/whatsappReliabilityHelper.js";

const STATUS_VALUES = ["queued", "sent", "delivered", "read", "failed", "hold", "skipped"];
const SUCCESS_STATUSES = ["sent", "delivered", "read"];

const parseDate = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const getDateRange = (query = {}) => {
  const to = parseDate(query.to, new Date());
  const from = parseDate(query.from, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
};

const buildAuditQuery = (query = {}) => {
  const { from, to } = getDateRange(query);
  const filter = { createdAt: { $gte: from, $lte: to } };

  if (query.template) filter.templateName = query.template;
  if (query.status) filter.status = query.status;
  if (query.sourceType) filter.sourceType = query.sourceType;
  if (query.businessId && mongoose.Types.ObjectId.isValid(query.businessId)) {
    filter.businessId = new mongoose.Types.ObjectId(query.businessId);
  }
  if (query.businessName) filter.businessName = { $regex: query.businessName, $options: "i" };
  if (query.category) filter.category = { $regex: query.category, $options: "i" };
  if (query.location) filter.location = { $regex: query.location, $options: "i" };
  if (query.recipientMobile) filter.recipientMobile = { $regex: query.recipientMobile.replace(/\D/g, ""), $options: "i" };
  if (query.customerMobile) filter.customerMobile = { $regex: query.customerMobile.replace(/\D/g, ""), $options: "i" };
  if (query.failureReason) filter.failureReason = { $regex: query.failureReason, $options: "i" };

  return filter;
};

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const safeFilePart = (value = "") => String(value || "")
  .trim()
  .replace(/[^a-z0-9]+/gi, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 70) || "MassClick";

const excelText = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const excelDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const xlsxText = (value = "") => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const columnName = (index) => {
  let name = "";
  let number = index;
  while (number > 0) {
    const remainder = (number - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    number = Math.floor((number - 1) / 26);
  }
  return name;
};

const xlsxCell = (value, rowIndex, columnIndex, style = 0) => {
  const ref = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xlsxText(value)}</t></is></c>`;
};

const xlsxRow = (values, rowIndex, height) => {
  const attrs = height ? ` r="${rowIndex}" ht="${height}" customHeight="1"` : ` r="${rowIndex}"`;
  return `<row${attrs}>${values.map((cell, index) => xlsxCell(
    cell?.value ?? cell,
    rowIndex,
    index + 1,
    cell?.style ?? 0
  )).join("")}</row>`;
};

const buildWorksheetXml = ({ rows, columns, merges = [], freezeRow = 0 }) => `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0" showGridLines="0">${freezeRow ? `<pane ySplit="${freezeRow}" topLeftCell="A${freezeRow + 1}" activePane="bottomLeft" state="frozen"/>` : ""}</sheetView></sheetViews>
  <cols>${columns.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>
  <sheetData>${rows.map((row, index) => xlsxRow(row.values, index + 1, row.height)).join("")}</sheetData>
  ${merges.length ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : ""}
  <pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
</worksheet>`.trim();

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = (date = new Date()) => {
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
};

const createZip = (files) => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = dosDateTime();

  files.forEach(({ name, content }) => {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const compressed = deflateRawSync(data);
    const crc = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(now.dosTime, 10);
    localHeader.writeUInt16LE(now.dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBuffer, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(now.dosTime, 12);
    centralHeader.writeUInt16LE(now.dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + compressed.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
};

const buildXlsxWorkbook = ({ rows, categorySummary, businessSummary, meta }) => {
  const totalLeads = rows.length;
  const uniqueCustomers = new Set(rows.map((row) => row.customerMobile).filter(Boolean)).size;
  const uniqueRecipients = new Set(rows.map((row) => row.recipientMobile).filter(Boolean)).size;
  const uniqueCategories = new Set(rows.map((row) => row.category).filter(Boolean)).size;
  const generatedAt = excelDate(new Date());

  const overviewRows = [
    { height: 32, values: [{ value: "MassClick Leads Report", style: 1 }, "", "", "", "", "", ""] },
    { height: 22, values: [{ value: `${meta.business} | ${meta.from} to ${meta.to}`, style: 2 }, "", "", "", "", "", ""] },
    { height: 10, values: ["", "", "", "", "", "", ""] },
    { height: 22, values: [{ value: "Report Filters", style: 3 }, "", "", "", "", "", ""] },
    { values: [{ value: "Business", style: 4 }, { value: meta.business, style: 7 }, { value: "Template", style: 4 }, { value: meta.template, style: 7 }, { value: "Location", style: 4 }, { value: meta.location, style: 7 }] },
    { values: [{ value: "From Date", style: 4 }, { value: meta.from, style: 7 }, { value: "To Date", style: 4 }, { value: meta.to, style: 7 }, { value: "Generated", style: 4 }, { value: generatedAt, style: 7 }] },
    { height: 10, values: ["", "", "", "", "", "", ""] },
    { height: 20, values: [{ value: "Executive Summary", style: 3 }, "", "", "", "", "", ""] },
    { height: 26, values: [{ value: "Successful Leads Sent", style: 5 }, { value: "Unique Customer Persons", style: 5 }, { value: "Business Numbers Got Leads", style: 5 }, { value: "Lead Categories", style: 5 }, "", "", ""] },
    { height: 32, values: [{ value: totalLeads, style: 6 }, { value: uniqueCustomers, style: 6 }, { value: uniqueRecipients, style: 6 }, { value: uniqueCategories, style: 6 }, "", "", ""] },
    { height: 10, values: ["", "", "", "", "", "", ""] },
    { height: 20, values: [{ value: "Top Categories", style: 3 }, "", "", "", "", "", ""] },
    { values: [{ value: "Rank", style: 8 }, { value: "Category", style: 8 }, { value: "Successful Leads", style: 8 }, { value: "Unique Customers", style: 8 }, { value: "Business Numbers", style: 8 }, "", ""] },
    ...categorySummary.slice(0, 10).map((item, index) => ({
      values: [
        { value: index + 1, style: 10 },
        { value: item._id?.category || "Uncategorised", style: 7 },
        { value: item.totalLeads, style: 9 },
        { value: item.uniqueCustomers?.filter(Boolean).length || 0, style: 9 },
        { value: item.uniqueRecipients?.filter(Boolean).length || 0, style: 9 },
      ],
    })),
  ];

  const categoryRows = [
    { height: 30, values: [{ value: "Category Performance", style: 1 }, "", "", "", ""] },
    { values: [{ value: "S.No", style: 8 }, { value: "Category", style: 8 }, { value: "Successful Leads", style: 8 }, { value: "Unique Customers", style: 8 }, { value: "Business Numbers", style: 8 }] },
    ...categorySummary.map((item, index) => ({
      values: [
        { value: index + 1, style: 10 },
        { value: item._id?.category || "Uncategorised", style: 7 },
        { value: item.totalLeads, style: 9 },
        { value: item.uniqueCustomers?.filter(Boolean).length || 0, style: 9 },
        { value: item.uniqueRecipients?.filter(Boolean).length || 0, style: 9 },
      ],
    })),
  ];

  const businessRows = [
    { height: 30, values: [{ value: "Business Lead Summary", style: 1 }, "", "", "", ""] },
    { values: [{ value: "S.No", style: 8 }, { value: "Business", style: 8 }, { value: "Successful Leads", style: 8 }, { value: "Unique Customers", style: 8 }, { value: "Categories Giving Leads", style: 8 }] },
    ...businessSummary.map((item, index) => ({
      values: [
        { value: index + 1, style: 10 },
        { value: item._id?.businessName || "Unknown Business", style: 7 },
        { value: item.totalLeads, style: 9 },
        { value: item.uniqueCustomers?.filter(Boolean).length || 0, style: 9 },
        { value: (item.categories || []).filter(Boolean).join(", ") || "-", style: 7 },
      ],
    })),
  ];

  const detailRows = [
    { height: 30, values: [{ value: "Successful Lead Details", style: 1 }, "", "", "", "", "", "", "", "", "", ""] },
    { values: [
      { value: "S.No", style: 8 },
      { value: "Lead Date", style: 8 },
      { value: "Business Name", style: 8 },
      { value: "Category", style: 8 },
      { value: "Location", style: 8 },
      { value: "Template", style: 8 },
      { value: "Lead Source", style: 8 },
      { value: "Customer Name", style: 8 },
      { value: "Customer Mobile", style: 8 },
      { value: "Business Mobile", style: 8 },
      { value: "Sent Time", style: 8 },
    ] },
    ...rows.map((row, index) => ({
      values: [
        { value: index + 1, style: 10 },
        { value: excelDate(row.createdAt), style: 7 },
        { value: row.businessName || "-", style: 7 },
        { value: row.category || "-", style: 7 },
        { value: row.location || "-", style: 7 },
        { value: row.templateName || "-", style: 7 },
        { value: row.sourceType || "-", style: 7 },
        { value: row.customerName || "-", style: 7 },
        { value: row.customerMobile || "-", style: 11 },
        { value: row.recipientMobile || "-", style: 11 },
        { value: excelDate(row.sentAt || row.deliveredAt || row.readAt || row.createdAt), style: 7 },
      ],
    })),
  ];

  const sheets = [
    { name: "Overview", path: "xl/worksheets/sheet1.xml", xml: buildWorksheetXml({ rows: overviewRows, columns: [18, 32, 20, 24, 20, 28, 16], merges: ["A1:G1", "A2:G2", "A4:G4", "A8:G8", "A12:G12"], freezeRow: 13 }) },
    { name: "Category Summary", path: "xl/worksheets/sheet2.xml", xml: buildWorksheetXml({ rows: categoryRows, columns: [10, 34, 18, 18, 18], merges: ["A1:E1"], freezeRow: 2 }) },
    { name: "Business Summary", path: "xl/worksheets/sheet3.xml", xml: buildWorksheetXml({ rows: businessRows, columns: [10, 42, 18, 18, 50], merges: ["A1:E1"], freezeRow: 2 }) },
    { name: "Lead Details", path: "xl/worksheets/sheet4.xml", xml: buildWorksheetXml({ rows: detailRows, columns: [8, 22, 36, 24, 18, 28, 18, 24, 18, 18, 22], merges: ["A1:K1"], freezeRow: 2 }) },
  ];

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheets.map((sheet, index) => `<sheet name="${xlsxText(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>
</workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets.map((sheet, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheets.map((sheet, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><color rgb="FF17202A"/><name val="Aptos"/></font>
    <font><b/><sz val="22"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
    <font><b/><sz val="20"/><color rgb="FF0F2A43"/><name val="Aptos Display"/></font>
    <font><b/><sz val="11"/><color rgb="FF526173"/><name val="Aptos"/></font>
  </fonts>
  <fills count="8">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F2A43"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF36C21"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FB"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7FAFC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE6F7EF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD8E0EA"/></left><right style="thin"><color rgb="FFD8E0EA"/></right><top style="thin"><color rgb="FFD8E0EA"/></top><bottom style="thin"><color rgb="FFD8E0EA"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="49" fontId="0" fillId="7" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const created = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>MassClick Leads Report</dc:title><dc:creator>MassClick</dc:creator><cp:lastModifiedBy>MassClick</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`;
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>MassClick</Application></Properties>`;

  return createZip([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rootRels },
    { name: "docProps/core.xml", content: coreXml },
    { name: "docProps/app.xml", content: appXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: stylesXml },
    ...sheets.map((sheet) => ({ name: sheet.path, content: sheet.xml })),
  ]);
};

const countByStatus = (statusCounts = []) => {
  const counts = STATUS_VALUES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  statusCounts.forEach((item) => {
    counts[item._id || "unknown"] = item.count;
  });
  return counts;
};

export const getMsg91AnalyticsSummaryAction = async (req, res) => {
  try {
    const filter = buildAuditQuery(req.query);

    const [statusAgg, templateAgg, sourceAgg, costAgg, topCategories, topLocations, topRecipients, topFailedRecipients, topSuppressedRecipients] = await Promise.all([
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: "$templateName", total: { $sum: 1 }, failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }, success: { $sum: { $cond: [{ $in: ["$status", SUCCESS_STATUSES] }, 1, 0] } }, cost: { $sum: "$price" } } },
        { $sort: { total: -1 } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: "$sourceType", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        { $group: { _id: null, totalCost: { $sum: "$price" }, chargedRows: { $sum: { $cond: [{ $gt: ["$price", 0] }, 1, 0] } } } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, category: { $ne: "" } } },
        { $group: { _id: "$category", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, location: { $ne: "" } } },
        { $group: { _id: "$location", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, recipientMobile: { $ne: "" } } },
        {
          $group: {
            _id: "$recipientMobile",
            totalAttempts: { $sum: 1 },
            failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
            skippedCount: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
            deliveredCount: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
            readCount: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
          },
        },
        { $sort: { totalAttempts: -1, _id: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            mobile: "$_id",
            totalAttempts: 1,
            failedCount: 1,
            skippedCount: 1,
            deliveredCount: 1,
            readCount: 1,
          },
        },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: { ...filter, status: "failed", recipientMobile: { $ne: "" } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: "$recipientMobile",
            failedCount: { $sum: 1 },
            undeliverableCount: {
              $sum: {
                $cond: [{ $eq: ["$failureCode", "131026"] }, 1, 0],
              },
            },
            ecosystemFailureCount: {
              $sum: {
                $cond: [{ $eq: ["$failureCode", "131049"] }, 1, 0],
              },
            },
            lastFailureReason: { $last: "$failureReason" },
          },
        },
        { $sort: { failedCount: -1, _id: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            mobile: "$_id",
            failedCount: 1,
            undeliverableCount: 1,
            ecosystemFailureCount: 1,
            lastFailureReason: 1,
          },
        },
      ]),
      whatsappRecipientHealthModel.aggregate([
        {
          $match: {
            $or: [
              { suppressedUntil: { $gt: new Date() } },
              { whatsappInvalid: true },
            ],
          },
        },
        { $sort: { suppressedUntil: -1, updatedAt: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            mobile: 1,
            suppressedUntil: 1,
            suppressReason: 1,
            whatsappInvalid: 1,
          },
        },
      ]),
    ]);

    const statusCounts = countByStatus(statusAgg);
    const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const success = SUCCESS_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);

    return res.json({
      success: true,
      data: {
        total,
        success,
        successRate: total ? Number(((success / total) * 100).toFixed(1)) : 0,
        failureRate: total ? Number((((statusCounts.failed || 0) / total) * 100).toFixed(1)) : 0,
        statusCounts,
        templates: templateAgg,
        sourceTypes: sourceAgg,
        cost: costAgg[0] || { totalCost: 0, chargedRows: 0 },
        topCategories,
        topLocations,
        topRecipients,
        topFailedRecipients,
        topSuppressedRecipients,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsTimeseriesAction = async (req, res) => {
  try {
    const filter = buildAuditQuery(req.query);
    const rows = await whatsappMessageAuditModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    const byDate = {};
    rows.forEach(({ _id, count }) => {
      byDate[_id.date] ||= { date: _id.date, total: 0, success: 0, failed: 0, skipped: 0, hold: 0 };
      byDate[_id.date].total += count;
      byDate[_id.date][_id.status] = count;
      if (SUCCESS_STATUSES.includes(_id.status)) byDate[_id.date].success += count;
      if (_id.status === "failed") byDate[_id.date].failed += count;
      if (_id.status === "skipped") byDate[_id.date].skipped += count;
      if (_id.status === "hold") byDate[_id.date].hold += count;
    });

    return res.json({ success: true, data: Object.values(byDate) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsFailuresAction = async (req, res) => {
  try {
    const filter = { ...buildAuditQuery(req.query), status: "failed" };
    const data = await whatsappMessageAuditModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            code: "$failureCode",
            reason: "$failureReason",
            template: "$templateName",
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 50 },
    ]);

    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsAuditAction = async (req, res) => {
  try {
    const filter = buildAuditQuery(req.query);
    const pageNo = Math.max(Number(req.query.pageNo) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 100);

    const [list, total] = await Promise.all([
      whatsappMessageAuditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      whatsappMessageAuditModel.countDocuments(filter),
    ]);

    return res.json({ success: true, data: list, total, pageNo, pageSize });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsFilterOptionsAction = async (req, res) => {
  try {
    const baseFilter = buildAuditQuery({
      ...req.query,
      template: "",
      location: "",
      category: "",
    });

    const [templates, locations, categories] = await Promise.all([
      whatsappMessageAuditModel.distinct("templateName", baseFilter),
      whatsappMessageAuditModel.distinct("location", baseFilter),
      whatsappMessageAuditModel.distinct("category", baseFilter),
    ]);

    return res.json({
      success: true,
      data: {
        templates: templates.filter(Boolean).sort(),
        locations: locations.filter(Boolean).sort(),
        categories: categories.filter(Boolean).sort(),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const searchMsg91AnalyticsBusinessesAction = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 50);
    const query = {};

    if (search) {
      const pattern = escapeRegex(search);
      query.$or = [
        { businessName: { $regex: pattern, $options: "i" } },
        { name: { $regex: pattern, $options: "i" } },
        { clientId: { $regex: pattern, $options: "i" } },
        { contact: { $regex: pattern, $options: "i" } },
        { whatsappNumber: { $regex: pattern, $options: "i" } },
        { category: { $regex: pattern, $options: "i" } },
        { location: { $regex: pattern, $options: "i" } },
      ];
    }

    const businesses = await businessListModel
      .find(query, { businessName: 1, name: 1, clientId: 1, category: 1, location: 1, contact: 1, whatsappNumber: 1 })
      .sort({ businessName: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: businesses.map((business) => ({
        _id: business._id,
        businessName: business.businessName || business.name || "",
        clientId: business.clientId || "",
        category: business.category || "",
        location: business.location || "",
        contact: business.contact || business.whatsappNumber || "",
      })),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportMsg91AnalyticsCsvAction = async (req, res) => {
  try {
    const filter = buildAuditQuery({ ...req.query, status: "", failureReason: "" });
    filter.status = { $in: SUCCESS_STATUSES };
    const { from, to } = getDateRange(req.query);
    const maxRows = Math.min(Math.max(Number(req.query.limit) || 25000, 1), 100000);

    const [rows, categorySummary, businessSummary] = await Promise.all([
      whatsappMessageAuditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(maxRows)
        .lean(),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { category: "$category" },
            totalLeads: { $sum: 1 },
            uniqueCustomers: { $addToSet: "$customerMobile" },
            uniqueRecipients: { $addToSet: "$recipientMobile" },
          },
        },
        { $sort: { totalLeads: -1, "_id.category": 1 } },
      ]),
      whatsappMessageAuditModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { businessName: "$businessName" },
            totalLeads: { $sum: 1 },
            uniqueCustomers: { $addToSet: "$customerMobile" },
            categories: { $addToSet: "$category" },
          },
        },
        { $sort: { totalLeads: -1, "_id.businessName": 1 } },
      ]),
    ]);

    let selectedBusinessName = req.query.businessName || rows[0]?.businessName || "All Businesses";
    if (req.query.businessId && mongoose.Types.ObjectId.isValid(req.query.businessId)) {
      const business = await businessListModel.findById(req.query.businessId, { businessName: 1, name: 1 }).lean();
      selectedBusinessName = business?.businessName || business?.name || selectedBusinessName;
    }

    const fromStamp = from.toISOString().slice(0, 10);
    const toStamp = to.toISOString().slice(0, 10);
    const fileName = `${safeFilePart(selectedBusinessName)}-${fromStamp}-to-${toStamp}-Leads-Report.xlsx`;
    const workbookBuffer = buildXlsxWorkbook({
      rows,
      categorySummary,
      businessSummary,
      meta: {
        from: excelDate(from),
        to: excelDate(to),
        business: selectedBusinessName,
        template: req.query.template || "All Templates",
        location: req.query.location || "All Locations",
      },
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.send(workbookBuffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMsg91AnalyticsRecipientsAction = async (req, res) => {
  try {
    const pageNo = Math.max(Number(req.query.pageNo) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), 100);
    const filter = {};

    if (req.query.mobile) filter.mobile = { $regex: req.query.mobile.replace(/\D/g, ""), $options: "i" };
    if (req.query.suppressed === "true") filter.suppressedUntil = { $gt: new Date() };
    if (req.query.invalid === "true") filter.whatsappInvalid = true;

    const [list, total] = await Promise.all([
      whatsappRecipientHealthModel
        .find(filter)
        .sort({ failedCount: -1, updatedAt: -1 })
        .skip((pageNo - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      whatsappRecipientHealthModel.countDocuments(filter),
    ]);

    return res.json({ success: true, data: list, total, pageNo, pageSize });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reviewMsg91RecipientAction = async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const doc = await whatsappRecipientHealthModel.findOneAndUpdate(
      { mobile },
      { $set: { reviewed: true, reviewedAt: new Date(), reviewedBy: req.authUser?.emailId || req.authUser?.email || "admin" } },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ success: false, message: "Recipient not found" });
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const unsuppressMsg91RecipientAction = async (req, res) => {
  try {
    const mobile = req.params.mobile;
    const doc = await whatsappRecipientHealthModel.findOneAndUpdate(
      { mobile },
      {
        $set: {
          suppressedUntil: null,
          suppressReason: "",
          whatsappInvalid: false,
          reviewed: true,
          reviewedAt: new Date(),
          reviewedBy: req.authUser?.emailId || req.authUser?.email || "admin",
        },
      },
      { new: true }
    ).lean();

    if (!doc) return res.status(404).json({ success: false, message: "Recipient not found" });
    return res.json({ success: true, data: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const msg91StatusWebhookAction = async (req, res) => {
  try {
    const updated = await updateWhatsAppDeliveryStatus(req.body || {});
    return res.json({ success: true, updated: !!updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
