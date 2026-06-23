const EXPORT_TIME_ZONE = "Asia/Kolkata";

const removeInvalidXmlChars = (value) =>
  Array.from(String(value ?? ""))
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 && code !== 9 && code !== 10 && code !== 13 ? " " : char;
    })
    .join("");

const xmlEscape = (value) =>
  removeInvalidXmlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripExportHtml = (value) =>
  String(value ?? "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanExportValue = (value) => {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) return value.map(cleanExportValue).filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, nestedValue]) => nestedValue != null && nestedValue !== "")
      .map(([key, nestedValue]) => `${key}: ${cleanExportValue(nestedValue)}`)
      .join("; ");
  }
  return stripExportHtml(value);
};

const normalizeSearchValue = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const collectSearchValues = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(collectSearchValues);
  if (value instanceof Date) return [value.toISOString()];
  if (typeof value === "object") return Object.values(value).flatMap(collectSearchValues);
  return [String(value)];
};

const buildSearchHaystack = (values) =>
  collectSearchValues(values).map(normalizeSearchValue).filter(Boolean).join(" ");

const valueMatchesSearch = (value, term) => {
  const normalizedTerm = normalizeSearchValue(term);
  if (!normalizedTerm) return true;
  const tokens = normalizedTerm.split(" ").filter(Boolean);
  const haystack = buildSearchHaystack(value);
  return tokens.every((token) => haystack.includes(token));
};

const matchesSelectedValue = (value, selectedValue) => {
  const selected = normalizeSearchValue(selectedValue);
  if (!selected) return true;
  const candidates = collectSearchValues(value).map(normalizeSearchValue).filter(Boolean);
  return candidates.some(
    (candidate) =>
      candidate === selected ||
      candidate.includes(selected) ||
      (candidate.length >= 3 && selected.includes(candidate))
  );
};

const formatExportDate = (value) => {
  const rawValue = value?.$date || value;
  if (!rawValue) return "";
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    timeZone: EXPORT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatOpeningHours = (hours) => {
  if (!Array.isArray(hours) || hours.length === 0) return "";
  return hours
    .map((hour) => {
      if (hour?.isClosed) return `${hour.day}: Closed`;
      if (hour?.is24Hours) return `${hour.day}: 24 Hours`;
      return `${hour?.day || ""}: ${hour?.open || "-"} to ${hour?.close || "-"}`;
    })
    .join("\n");
};

const formatPayments = (payments) => {
  if (!Array.isArray(payments) || payments.length === 0) return "";
  return payments
    .map((payment) => {
      const amount = payment.totalAmount || payment.amount || "";
      const status = payment.paymentStatus || payment.status || "";
      const paidOn = formatExportDate(payment.paymentDate);
      return [status, amount ? `Rs. ${amount}` : "", paidOn].filter(Boolean).join(" | ");
    })
    .join("\n");
};

const formatMniDetails = (details) => {
  if (!Array.isArray(details) || details.length === 0) return "";
  return details
    .map((item) =>
      [
        item?.categoryGroup ? `Group: ${item.categoryGroup}` : "",
        item?.categoryGroupLocation ? `Location: ${item.categoryGroupLocation}` : "",
        item?.leadsCount != null ? `Leads: ${item.leadsCount}` : "",
        Array.isArray(item?.leadsCategory) && item.leadsCategory.length
          ? `Lead Categories: ${item.leadsCategory.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join(" | ")
    )
    .join("\n");
};

const getCoordinate = (row, index) => {
  const value = row.geoLocation?.coordinates?.[index];
  return value == null || value === "" ? "" : value;
};

const getObjectId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return value.$oid || value._id || value.id || "";
  return String(value);
};

const getUserDisplayName = (user) =>
  user?.userName || user?.name || user?.fullName || user?.emailId || user?.email || "";

const getCreatedByDisplayName = (createdBy, usersById = new Map()) => {
  if (!createdBy) return "";
  if (typeof createdBy === "object") {
    const populatedName = getUserDisplayName(createdBy);
    if (populatedName) return populatedName;
  }
  return getUserDisplayName(usersById.get(getObjectId(createdBy))) || getObjectId(createdBy);
};

const isBusinessPaid = (row) => {
  if (row.amountPaid === true || Boolean(row.paidDate)) return true;
  if (!Array.isArray(row.payment)) return false;
  return row.payment.some((payment) => {
    if (!payment || typeof payment !== "object") return false;
    const status = normalizeSearchValue(payment.status || payment.paymentStatus || payment.payment_status);
    const amount = Number(payment.amount || payment.amountPaid || payment.paidAmount || payment.totalAmount || 0);
    return status === "paid" || status === "success" || amount > 0 || payment.paid === true;
  });
};

const businessMatchesExportFilters = (row, filters = {}) => {
  const searchTerm = String(filters.searchTerm || "").trim();
  const category = String(filters.category || "").trim();
  const location = String(filters.location || "").trim();
  const paymentStatus = String(filters.paymentStatus || "all").trim().toLowerCase();

  if (
    searchTerm &&
    !valueMatchesSearch(
      [
        row.clientId,
        row._id,
        row.businessName,
        row.location,
        row.category,
        row.email,
        row.contact,
        row.contactList,
        row.whatsappNumber,
        row.globalAddress,
        row.street,
        row.pincode,
        row.gstin,
        row.title,
        row.description,
        row.seoTitle,
        row.seoDescription,
        row.slug,
        row.businessDetails,
        row.keywords,
        row.filters,
        row.mniDetails,
        row.openingHours,
        row.website,
        row.googleMap,
      ],
      searchTerm
    )
  ) {
    return false;
  }

  if (!matchesSelectedValue([row.category, row.mniDetails, row.filters], category)) return false;
  if (!matchesSelectedValue([row.location, row.globalAddress, row.street, row.pincode, row.googleMap], location)) return false;

  if (paymentStatus !== "all") {
    const paid = isBusinessPaid(row);
    if (paymentStatus === "paid" && !paid) return false;
    if (paymentStatus === "pending" && paid) return false;
  }

  return true;
};

const getExcelColumnName = (index) => {
  let columnIndex = index + 1;
  let columnName = "";
  while (columnIndex > 0) {
    const remainder = (columnIndex - 1) % 26;
    columnName = String.fromCharCode(65 + remainder) + columnName;
    columnIndex = Math.floor((columnIndex - 1) / 26);
  }
  return columnName;
};

const exportColumns = [
  { label: "S.No", width: 7, value: (_, index) => index + 1, style: 4 },
  { label: "Client ID", width: 34, value: (row) => row.clientId },
  { label: "Business Name", width: 34, value: (row) => row.businessName },
  { label: "Category", width: 24, value: (row) => row.category },
  { label: "Location", width: 22, value: (row) => row.location },
  { label: "Plot No", width: 14, value: (row) => row.plotNumber },
  { label: "Street", width: 38, value: (row) => row.street },
  { label: "Pincode", width: 14, value: (row) => row.pincode },
  { label: "Full Address", width: 46, value: (row) => row.globalAddress },
  { label: "Contact", width: 17, value: (row) => row.contact },
  { label: "Contact List", width: 18, value: (row) => row.contactList },
  { label: "WhatsApp", width: 17, value: (row) => row.whatsappNumber },
  { label: "Email", width: 28, value: (row) => row.email },
  { label: "GSTIN", width: 20, value: (row) => row.gstin },
  { label: "Experience", width: 14, value: (row) => row.experience },
  { label: "Payment Status", width: 16, value: (row) => (isBusinessPaid(row) ? "Paid" : "Pending") },
  { label: "Paid Date", width: 22, value: (row) => formatExportDate(row.paidDate) },
  { label: "Payment History", width: 34, value: (row) => formatPayments(row.payment) },
  { label: "Live", width: 10, value: (row) => row.businessesLive },
  { label: "Active", width: 10, value: (row) => row.activeBusinesses },
  { label: "Verified", width: 12, value: (row) => row.verification?.isVerified },
  { label: "Verification Type", width: 18, value: (row) => row.verification?.verificationType },
  { label: "Featured", width: 12, value: (row) => row.badges?.isFeatured },
  { label: "Sponsored", width: 12, value: (row) => row.badges?.isSponsored },
  { label: "Trending", width: 12, value: (row) => row.badges?.isTrending },
  { label: "Priority Score", width: 14, value: (row) => row.badges?.priorityScore, style: 4 },
  { label: "Created By", width: 24, value: (row, _index, context) => getCreatedByDisplayName(row.createdBy, context.usersById) },
  { label: "Created At", width: 22, value: (row) => formatExportDate(row.createdAt) },
  { label: "Updated At", width: 22, value: (row) => formatExportDate(row.updatedAt) },
  { label: "Opening Hours", width: 42, value: (row) => formatOpeningHours(row.openingHours) },
  { label: "Keywords", width: 38, value: (row) => row.keywords },
  { label: "Title", width: 34, value: (row) => row.title },
  { label: "Description", width: 50, value: (row) => row.description },
  { label: "SEO Title", width: 38, value: (row) => row.seoTitle },
  { label: "SEO Description", width: 50, value: (row) => row.seoDescription },
  { label: "Slug", width: 32, value: (row) => row.slug },
  { label: "Business Details", width: 54, value: (row) => row.businessDetails },
  { label: "Website", width: 34, value: (row) => row.website },
  { label: "Google Map", width: 44, value: (row) => row.googleMap },
  { label: "Facebook", width: 28, value: (row) => row.facebook },
  { label: "Instagram", width: 28, value: (row) => row.instagram },
  { label: "YouTube", width: 28, value: (row) => row.youtube },
  { label: "Pinterest", width: 28, value: (row) => row.pinterest },
  { label: "Twitter", width: 28, value: (row) => row.twitter },
  { label: "LinkedIn", width: 28, value: (row) => row.linkedin },
  { label: "Longitude", width: 14, value: (row) => getCoordinate(row, 0), style: 4 },
  { label: "Latitude", width: 14, value: (row) => getCoordinate(row, 1), style: 4 },
  { label: "Category Group / MNI", width: 42, value: (row) => formatMniDetails(row.mniDetails) },
  { label: "Category Filters", width: 42, value: (row) => row.filters },
  { label: "QR Review Link", width: 48, value: (row) => row.qrCode?.qrText || row.qrText },
  { label: "QR Downloads", width: 16, value: (row) => row.qrDownloads?.length || 0, style: 4 },
];

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pushUint16 = (target, value) => {
  target.push(value & 0xff, (value >>> 8) & 0xff);
};

const pushUint32 = (target, value) => {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
};

const createZip = (files) => {
  const parts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = Buffer.from(file.name, "utf8");
    const dataBytes = Buffer.from(file.content, "utf8");
    const checksum = crc32(dataBytes);
    const localHeader = [];

    pushUint32(localHeader, 0x04034b50);
    pushUint16(localHeader, 20);
    pushUint16(localHeader, 0);
    pushUint16(localHeader, 0);
    pushUint16(localHeader, 0);
    pushUint16(localHeader, 0);
    pushUint32(localHeader, checksum);
    pushUint32(localHeader, dataBytes.length);
    pushUint32(localHeader, dataBytes.length);
    pushUint16(localHeader, nameBytes.length);
    pushUint16(localHeader, 0);

    parts.push(Buffer.from(localHeader), nameBytes, dataBytes);

    const centralHeader = [];
    pushUint32(centralHeader, 0x02014b50);
    pushUint16(centralHeader, 20);
    pushUint16(centralHeader, 20);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint32(centralHeader, checksum);
    pushUint32(centralHeader, dataBytes.length);
    pushUint32(centralHeader, dataBytes.length);
    pushUint16(centralHeader, nameBytes.length);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint32(centralHeader, 0);
    pushUint32(centralHeader, offset);
    centralParts.push(Buffer.from(centralHeader), nameBytes);

    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const centralOffset = offset;
  const endRecord = [];
  pushUint32(endRecord, 0x06054b50);
  pushUint16(endRecord, 0);
  pushUint16(endRecord, 0);
  pushUint16(endRecord, files.length);
  pushUint16(endRecord, files.length);
  pushUint32(endRecord, centralSize);
  pushUint32(endRecord, centralOffset);
  pushUint16(endRecord, 0);

  return Buffer.concat([...parts, ...centralParts, Buffer.from(endRecord)]);
};

export const buildBusinessExportWorkbook = (businesses = [], context = {}) => {
  const filteredBusinesses = businesses.filter((business) => businessMatchesExportFilters(business, context.filters));
  const sheetRows = [
    `<row r="1" ht="24" customHeight="1">${exportColumns
      .map((column, index) => `<c r="${getExcelColumnName(index)}1" s="1" t="inlineStr"><is><t>${xmlEscape(column.label)}</t></is></c>`)
      .join("")}</row>`,
    ...filteredBusinesses.map((row, rowIndex) => {
      const excelRow = rowIndex + 2;
      const cells = exportColumns
        .map((column, colIndex) => {
          const cellRef = `${getExcelColumnName(colIndex)}${excelRow}`;
          const rawValue = column.value(row, rowIndex, context);
          const value = cleanExportValue(rawValue);
          const style = column.style || 2;
          return `<c r="${cellRef}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        })
        .join("");
      return `<row r="${excelRow}" ht="42" customHeight="1">${cells}</row>`;
    }),
  ].join("");

  const lastColumn = getExcelColumnName(exportColumns.length - 1);
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${exportColumns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join("")}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastColumn}${Math.max(filteredBusinesses.length + 1, 1)}"/>
</worksheet>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF8C00"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2EC"/></left><right style="thin"><color rgb="FFD9E2EC"/></right><top style="thin"><color rgb="FFD9E2EC"/></top><bottom style="thin"><color rgb="FFD9E2EC"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

  const buffer = createZip([
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>MassClick Business Export</dc:title><dc:creator>MassClick Admin</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>` },
    { name: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MassClick</Application></Properties>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Business Directory" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: styles },
    { name: "xl/worksheets/sheet1.xml", content: worksheet },
  ]);

  return {
    buffer,
    rowCount: filteredBusinesses.length,
  };
};
