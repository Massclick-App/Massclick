export const MOBILE_RECHARGE_OPERATORS = [
  { name: "Airtel", code: "AIRTEL" },
  { name: "BSNL", code: "BSNL" },
  { name: "Jio", code: "JIO", providerId: 6 },
  { name: "Vi", code: "VI" },
];

export const MOBILE_CIRCLES = [
  "Tamil Nadu",
  "Andhra Pradesh",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Delhi",
  "Assam",
  "Bihar Jharkhand",
  "Chennai",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu Kashmir",
  "Kolkata",
  "Madhya Pradesh Chhattisgarh",
  "Mumbai",
  "North East",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Uttar Pradesh East",
  "Uttar Pradesh West",
  "West Bengal",
  "Other",
];

export const QUICK_RECHARGE_AMOUNTS = {
  Jio: [199, 239, 299, 349, 399, 479, 666, 749],
  Airtel: [199, 239, 299, 349, 409, 579, 649, 799],
  Vi: [199, 239, 299, 349, 449, 649, 719, 799],
  BSNL: [107, 147, 199, 239, 397, 485, 666, 997],
  default: [199, 239, 299, 349, 399, 499],
};

export const getQuickRechargeAmounts = (operator) => QUICK_RECHARGE_AMOUNTS[operator] || QUICK_RECHARGE_AMOUNTS.default;

export const BILL_SERVICES = [
  { slug: "mobile-prepaid", name: "Prepaid", group: "Mobile", title: "Mobile Prepaid Recharge", fields: ["mobile", "operator", "circle", "amount"], options: { operator: MOBILE_RECHARGE_OPERATORS.map((operator) => operator.name) } },
  { slug: "mobile-postpaid", name: "Postpaid", group: "Mobile", title: "Pay Mobile Postpaid Bill", fields: ["mobile", "operator", "circle", "amount"], options: { operator: ["Airtel Postpaid", "BSNL Postpaid", "Jio Postpaid", "Vi Postpaid"] } },
  { slug: "electricity", name: "Electricity", title: "Pay Electricity Bill", fields: ["state", "provider", "consumer", "amount"], optionsByState: { "Tamil Nadu": ["TANGEDCO"], "Andhra Pradesh": ["APEPDCL", "APSPDCL"], Karnataka: ["BESCOM", "CESCOM", "HESCOM"], Kerala: ["KSEB"], Maharashtra: ["Adani Electricity Mumbai", "MSEDCL", "Tata Power Mumbai"], Delhi: ["BSES Rajdhani", "BSES Yamuna", "Tata Power Delhi"], Other: ["Other electricity board"] } },
  { slug: "dth", name: "DTH", title: "Recharge Your DTH Connection", fields: ["operator", "subscriber", "amount"], options: { operator: ["Airtel Digital TV", "Dish TV", "d2h", "Sun Direct", "Tata Play"] } },
  { slug: "water", name: "Water Bill", title: "Pay Water Bill", fields: ["state", "provider", "consumer", "amount"], optionsByState: { "Tamil Nadu": ["Chennai Metro Water", "Tamil Nadu Municipal Water Supply"], "Andhra Pradesh": ["Municipal Water Supply Andhra Pradesh"], Karnataka: ["Bangalore Water Supply (BWSSB)"], Kerala: ["Kerala Water Authority"], Maharashtra: ["Municipal Corporation Water Department"], Delhi: ["Delhi Jal Board"], Other: ["Other municipal water board"] } },
  { slug: "broadband", name: "Broadband", title: "Pay Broadband Bill", fields: ["provider", "account", "amount"], options: { provider: ["ACT Fibernet", "Airtel Xstream Fiber", "BSNL Broadband", "Hathway", "JioFiber", "Tata Play Fiber"] } },
  { slug: "gas", name: "Gas Bill", title: "Pay Gas Bill", fields: ["state", "provider", "consumer", "amount"], optionsByState: { "Tamil Nadu": ["AG&P Pratham", "IndianOil LNG"], "Andhra Pradesh": ["Bhagyanagar Gas", "Megha Gas"], Karnataka: ["GAIL Gas", "IndianOil-Adani Gas"], Kerala: ["IndianOil-Adani Gas"], Maharashtra: ["Adani Total Gas", "Mahanagar Gas", "Maharashtra Natural Gas"], Delhi: ["Indraprastha Gas"], Other: ["Bharat Gas", "HP Gas", "Indane Gas"] } },
  { slug: "landline", name: "Landline", title: "Pay Landline Bill", fields: ["provider", "account", "landline", "amount"], options: { provider: ["Airtel Landline", "BSNL Landline", "MTNL Delhi", "MTNL Mumbai", "Tata Tele Business"] } },
  { slug: "insurance", name: "Insurance", title: "Pay Insurance Premium", fields: ["provider", "policy", "birthDate", "amount"], options: { provider: ["Bajaj Allianz Life", "HDFC Life", "ICICI Prudential Life", "LIC of India", "Max Life", "SBI Life"] } },
  { slug: "cable-tv", name: "Cable TV", title: "Recharge Cable TV", fields: ["provider", "subscriber", "amount"], options: { provider: ["ACT Digital TV", "Hathway Digital", "Siti Networks", "Tamil Nadu Arasu Cable TV", "You Broadband Cable"] } },
  { slug: "fastag", name: "FASTag", title: "Recharge FASTag", fields: ["provider", "vehicle", "amount"], options: { provider: ["Axis Bank FASTag", "HDFC Bank FASTag", "ICICI Bank FASTag", "IDFC FIRST FASTag", "Indian Highways Management", "SBI FASTag"] } },
  { slug: "loan-repayment", name: "Loan Repayment", title: "Loan Repayment", fields: ["provider", "loan", "mobile", "amount"], options: { provider: ["Bajaj Finance", "HDB Financial Services", "HDFC Bank Loans", "ICICI Bank Loans", "Muthoot Finance", "SBI Loans"] } },
  { slug: "subscription", name: "Subscription", title: "Pay Subscription", fields: ["provider", "subscriber", "amount"], options: { provider: ["Amazon Prime", "Disney+ Hotstar", "Netflix", "SonyLIV", "Spotify", "ZEE5"] } },
  { slug: "education", name: "Education", title: "Pay Education Fees", fields: ["provider", "student", "amount"], options: { provider: ["College / University", "Coaching Institute", "Online Learning Platform", "School"] } },
  { slug: "donation", name: "Donation", title: "Make a Donation", fields: ["provider", "donor", "mobile", "amount"], options: { provider: ["Charitable Trust", "Education Fund", "Medical Relief Fund", "Religious Institution"] } },
  { slug: "rental", name: "Rental", title: "Pay Rent", fields: ["landlord", "account", "amount"] },
  { slug: "municipal-services", name: "Municipal Services", title: "Pay Municipal Bill", fields: ["state", "provider", "consumer", "amount"], optionsByState: { "Tamil Nadu": ["Greater Chennai Corporation", "Tamil Nadu Municipal Administration"], "Andhra Pradesh": ["Andhra Pradesh Municipal Administration"], Karnataka: ["BBMP", "Karnataka Municipal Data Society"], Kerala: ["Kerala Local Self Government"], Maharashtra: ["Municipal Corporation of Greater Mumbai", "Pune Municipal Corporation"], Delhi: ["Municipal Corporation of Delhi"], Other: ["Other municipal authority"] } },
  { slug: "ev-recharge", name: "EV Recharge", title: "Recharge Your EV Account", fields: ["provider", "account", "mobile", "amount"], options: { provider: ["Ather Grid", "ChargeZone", "Jio-bp pulse", "Statiq", "Tata Power EZ Charge"] } },
];

export const FIELD_CONFIG = {
  mobile: { label: "Mobile number", type: "tel", inputMode: "numeric", placeholder: "Enter 10-digit mobile number", pattern: "[6-9][0-9]{9}", maxLength: 10 },
  landline: { label: "Landline number with STD code", type: "tel", inputMode: "numeric", placeholder: "Enter landline number" },
  amount: { label: "Bill amount", type: "number", inputMode: "decimal", placeholder: "Enter amount", min: "1", prefix: "₹" },
  operator: { label: "Operator", type: "select", placeholder: "Select operator", options: [] },
  circle: { label: "Circle", type: "select", placeholder: "Select circle", options: MOBILE_CIRCLES },
  state: { label: "State", type: "select", placeholder: "Select state", options: ["Tamil Nadu", "Andhra Pradesh", "Karnataka", "Kerala", "Maharashtra", "Delhi", "Other"] },
  provider: { label: "Service provider / biller", type: "select", placeholder: "Select service provider", options: [] },
  consumer: { label: "Consumer number", type: "text", placeholder: "Enter consumer number" },
  subscriber: { label: "Subscriber ID / registered mobile", type: "text", placeholder: "Enter subscriber details" },
  account: { label: "Account number", type: "text", placeholder: "Enter account number" },
  policy: { label: "Policy number", type: "text", placeholder: "Enter policy number" },
  birthDate: { label: "Policy holder date of birth", type: "date" },
  vehicle: { label: "Vehicle registration number", type: "text", placeholder: "Example: TN01AB1234" },
  loan: { label: "Loan account number", type: "text", placeholder: "Enter loan account number" },
  student: { label: "Student ID / roll number", type: "text", placeholder: "Enter student ID" },
  donor: { label: "Donor name", type: "text", placeholder: "Enter donor name" },
  landlord: { label: "Landlord / property name", type: "text", placeholder: "Enter landlord or property name" },
};

export const getBillService = (slug) => BILL_SERVICES.find((service) => service.slug === slug);
