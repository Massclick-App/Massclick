export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const newAgreement = () => ({
  isActive: true,
  agreementNo: "",
  agreementSequence: "",
  issueDate: today(),
  place: "Tiruchirappalli, Tamil Nadu, India",
  amount: 24000,
  taxRate: 18,
  businessName: "",
  clientName: "",
  clientAddress: "",
  clientDate: today(),
  clientPlace: "",
  companyName: "M. Muruganantham",
  companyDesignation: "Managing Director",
  companyDate: today(),
  companyPlace: "Tiruchirappalli, Tamil Nadu, India",
});
export const agreementForm = (record) => {
  const result = { ...newAgreement(), ...record };
  result.agreementSequence =
    /^MC\/\d{6}\/(\d{6})$/.exec(record.agreementNo || "")?.[1] || "";
  for (const key of ["issueDate", "clientDate", "companyDate"])
    result[key] = String(result[key] || "").slice(0, 10);
  return result;
};
export const agreementPrefix = (date) => {
  const [year, month, day] = String(date || "").split("-");
  return year && month && day
    ? `MC/${day}${month}${year.slice(-2)}/`
    : "MC/DDMMYY/";
};
export const dateLabel = (value) =>
  value
    ? String(value).slice(0, 10).split("-").reverse().join(" / ")
    : "____ / ____ / ______";
export const totals = (record) => {
  const amount = Math.round(Number(record.amount || 0) * 100) / 100;
  const tax = Math.round(amount * Number(record.taxRate || 0)) / 100;
  return { amount, tax, total: Math.round((amount + tax) * 100) / 100 };
};
export const money = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}/-`;
