const POLICY_HEADERS = [
  "category_name", "category_key", "enquiry_points", "accepted_points",
  "completed_points", "customer_confirmed_points", "maximum_per_enquiry",
  "monthly_customer_cap", "validity_days", "approval_mode", "status",
];

const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const cellValue = (cell) => {
  const value = cell?.value;
  if (value && typeof value === "object") return value.result ?? value.text ?? value.richText?.map((part) => part.text).join("") ?? "";
  return value ?? "";
};
const toNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};
const toEnabled = (value) => !["paused", "inactive", "false", "no", "0"].includes(String(value).trim().toLowerCase());

export async function downloadRewardPolicyTemplate(categories = []) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "MassClick";
  const policies = workbook.addWorksheet("Reward Policies", { views: [{ state: "frozen", ySplit: 1 }] });
  policies.addRow(POLICY_HEADERS);
  const sample = categories[0] || { category: "Replace with category name", slug: "replace-with-category-key" };
  policies.addRow([sample.category, sample.slug || "", 10, 5, 10, 0, 25, 1000, 365, "automatic", "active"]);
  policies.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE56B0C" } }; });
  policies.columns.forEach((column, index) => { column.width = index < 2 ? 25 : 22; });
  policies.autoFilter = { from: "A1", to: "K1" };
  policies.dataValidations.add("J2:J1000", { type: "list", allowBlank: false, formulae: ['"automatic,manual"'] });
  policies.dataValidations.add("K2:K1000", { type: "list", allowBlank: false, formulae: ['"active,paused"'] });

  const instructions = workbook.addWorksheet("Instructions");
  [
    ["MassClick Reward Policy Import"],
    ["One row creates or updates one category policy. Do not rename the Reward Policies headers."],
    ["category_name", "Required. Use the exact name from the Categories sheet."],
    ["category_key", "Optional when category_name exactly matches. Existing keys are updated."],
    ["Points fields", "Whole numbers greater than or equal to 0."],
    ["maximum_per_enquiry", "Required and greater than 0."],
    ["monthly_customer_cap", "Must be greater than or equal to maximum_per_enquiry."],
    ["validity_days", "Use 0 for no expiry."],
    ["approval_mode", "automatic or manual."],
    ["status", "active or paused."],
  ].forEach((row) => instructions.addRow(row));
  instructions.getRow(1).font = { bold: true, size: 16, color: { argb: "FFE56B0C" } };
  instructions.getColumn(1).width = 28; instructions.getColumn(2).width = 82;

  const catalogue = workbook.addWorksheet("Categories", { views: [{ state: "frozen", ySplit: 1 }] });
  catalogue.addRow(["category_name", "category_key", "category_id", "category_type", "parent"]);
  categories.forEach((category) => catalogue.addRow([category.category, category.slug || "", category._id, category.categoryType || "", category.parentName || ""]));
  catalogue.getRow(1).eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF132238" } }; });
  catalogue.columns.forEach((column) => { column.width = 28; });
  catalogue.autoFilter = { from: "A1", to: "E1" };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "massclick-reward-policy-template.xlsx"; anchor.click();
  URL.revokeObjectURL(url);
}

export async function parseRewardPolicyWorkbook(file, categories = [], existingRules = []) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  // Excel may retain a stale table relationship after users add/remove sheets or
  // convert a range to a table. ExcelJS crashes while resolving that optional
  // metadata even though the worksheet cells are valid. Policies do not depend
  // on table definitions, so ignore tableParts and read the cell data safely.
  await workbook.xlsx.load(await file.arrayBuffer(), { ignoreNodes: ["tableParts"] });
  const sheet = workbook.getWorksheet("Reward Policies") || workbook.worksheets[0];
  if (!sheet) throw new Error("The workbook does not contain a worksheet.");
  const headers = new Map();
  sheet.getRow(1).eachCell((cell, column) => headers.set(normalize(cellValue(cell)), column));
  const columnFor = (name) => headers.get(normalize(name));
  const missing = POLICY_HEADERS.filter((header) => !columnFor(header));
  if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

  const categoryByName = new Map(categories.map((category) => [normalize(category.category), category]));
  const categoryByKey = new Map(categories.filter((category) => category.slug).map((category) => [normalize(category.slug), category]));
  const existingKeys = new Set(existingRules.map((rule) => normalize(rule.categoryKey)));
  const seen = new Set();
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const read = (header) => cellValue(row.getCell(columnFor(header)));
    const categoryName = String(read("category_name")).trim();
    const suppliedKey = String(read("category_key")).trim();
    if (!categoryName && !suppliedKey && row.values.filter(Boolean).length === 0) return;
    const category = categoryByKey.get(normalize(suppliedKey)) || categoryByName.get(normalize(categoryName));
    const errors = [];
    if (!category) errors.push("Category not found in MassClick catalogue");
    const categoryKey = category?.slug || suppliedKey || categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (seen.has(normalize(categoryKey))) errors.push("Duplicate category in this file");
    seen.add(normalize(categoryKey));
    const numeric = {
      basePoints: toNumber(read("enquiry_points")), acceptedBonus: toNumber(read("accepted_points")),
      completedBonus: toNumber(read("completed_points")), customerConfirmedBonus: toNumber(read("customer_confirmed_points")),
      maxPointsPerEnquiry: toNumber(read("maximum_per_enquiry")), monthlyCustomerCap: toNumber(read("monthly_customer_cap")),
      pointsExpireAfterDays: toNumber(read("validity_days")),
    };
    Object.entries(numeric).forEach(([field, value]) => { if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) errors.push(`${field} must be a whole number of 0 or more`); });
    if (!(numeric.maxPointsPerEnquiry > 0)) errors.push("Maximum per enquiry must be greater than 0");
    if (numeric.monthlyCustomerCap < numeric.maxPointsPerEnquiry) errors.push("Monthly cap must be at least the enquiry maximum");
    const approvalMode = String(read("approval_mode") || "automatic").trim().toLowerCase();
    if (!["automatic", "manual"].includes(approvalMode)) errors.push("Approval mode must be automatic or manual");
    const status = String(read("status") || "active").trim().toLowerCase();
    if (!["active", "paused", "inactive", "true", "false", "yes", "no", "1", "0"].includes(status)) errors.push("Status must be active or paused");
    rows.push({ rowNumber, errors, action: existingKeys.has(normalize(categoryKey)) ? "Update" : "Create", rule: { categoryId: category?._id || "", categoryName: category?.category || categoryName, categoryKey, ...numeric, approvalMode, enabled: toEnabled(status) } });
  });
  if (!rows.length) throw new Error("No reward policy rows were found.");
  return rows;
}
