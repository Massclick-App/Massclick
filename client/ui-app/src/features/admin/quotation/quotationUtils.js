export const MASSCLICK_PRODUCT_ITEM = {
  description: "MassClick Product",
  quantity: 1,
  unitPrice: 24000,
};

export const MASSCLICK_GST_RATE = 18;

export const PRODUCT_INCLUSION_TEXT =
  "Local business discovery, lead generation, service cards, and MNI network access.";

export const serviceAdvantagesText = (quotation) => {
  const months = Number(quotation.digitalMarketingMonths || 0);
  const videos = Number(quotation.youtubeVideoCount || 0);
  const websites = Number(quotation.websiteCount || 0);
  const values = [
    months ? `Digital marketing: ${months} ${months === 1 ? "month" : "months"}` : null,
    videos ? `YouTube: ${videos} ${videos === 1 ? "video" : "videos"}` : null,
    websites ? `Websites: ${websites}` : null,
  ].filter(Boolean);
  return values.length ? values.join(" | ") : "No additional services selected";
};

export const DEFAULT_TERMS =
  "MassClick product quotation. The listed product amount and GST are fixed. This quotation includes one free basic website.";

export const whyChooseMassClick = [
  {
    title: "Google Generated WhatsApp Leads",
    text: "Receive genuine customer enquiries directly on your WhatsApp from users who discover your business through Google and MassClick.",
    tamilText: "Google மற்றும் MassClick மூலம் உங்கள் வணிகத்தை கண்டுபிடிக்கும் வாடிக்கையாளர்களின் உண்மையான Lead-கள் நேரடியாக உங்கள் WhatsApp-க்கு வரும்.",
  },
  {
    title: "Website Search Based Generated Leads",
    text: "When customers search for products or services on MassClick, matching businesses instantly receive qualified customer leads.",
    tamilText: "MassClick-ல் வாடிக்கையாளர்கள் தேடும்போது, அதற்கு பொருந்தும் வணிகங்களுக்கு உடனடியாக Lead-கள் அனுப்பப்படும்.",
  },
  {
    title: "Popular Categories & Trending Search Leads",
    text: "Businesses listed in popular categories and trending searches gain more visibility and receive more customer enquiries.",
    tamilText: "Popular Categories மற்றும் Trending Searches-ல் இடம்பெறும் வணிகங்களுக்கு அதிக பார்வையும் அதிக Lead-களும் கிடைக்கும்.",
  },
  {
    title: "MNI (MassClick Network India)",
    text: "Connect with verified businesses across industries to create partnerships, referrals, and new business opportunities.",
    tamilText: "பல்வேறு துறைகளில் உள்ள சரிபார்க்கப்பட்ட வணிகர்களுடன் இணைந்து புதிய வணிக வாய்ப்புகள் மற்றும் Referral-களை உருவாக்கலாம்.",
  },
  {
    title: "Marketing Materials",
    text: "Access ready-to-use marketing tools such as posters, brochures, digital visiting cards, and branding materials.",
    tamilText: "Poster, Brochure, Digital Visiting Card போன்ற தொழில்முறை Marketing Materials-ஐ எளிதாக பயன்படுத்தலாம்.",
  },
  {
    title: "MassClick Feed",
    text: "Share daily offers, discounts, updates, photos, and videos to engage customers and increase business visibility.",
    tamilText: "தினசரி Offers, Discounts, Updates, Photos மற்றும் Videos-ஐ பகிர்ந்து அதிக வாடிக்கையாளர்களை ஈர்க்கலாம்.",
  },
  {
    title: "Publicize",
    text: "Promote your business profile across the MassClick platform to increase brand awareness and customer reach.",
    tamilText: "MassClick முழுவதும் உங்கள் வணிகத்தை முன்னிலைப்படுத்தி Brand Awareness மற்றும் Customer Reach-ஐ அதிகரிக்கலாம்.",
  },
  {
    title: "Enquiry Now Leads",
    text: "Customers can send enquiries instantly through the Enquiry Now button, helping businesses respond quickly.",
    tamilText: "\"Enquiry Now\" பொத்தான் மூலம் வாடிக்கையாளர்கள் உடனடியாக தொடர்புகொள்ளலாம்; வணிகர்கள் விரைவாக பதிலளிக்கலாம்.",
  },
  {
    title: "Direct Customer Chats",
    text: "Chat directly with customers to answer questions, share details, and close deals faster.",
    tamilText: "வாடிக்கையாளர்களுடன் நேரடியாக Chat செய்து தகவல்களை பகிர்ந்து விரைவாக விற்பனையை நிறைவேற்றலாம்.",
  },
  {
    title: "Knowledge Hub",
    text: "Learn business strategies, marketing tips, and industry updates to grow your business with confidence.",
    tamilText: "வணிக வளர்ச்சிக்கான Marketing Tips, Business Strategies மற்றும் Industry Updates-ஐ ஒரே இடத்தில் அறிந்து கொள்ளலாம்.",
  },
];

export const importantNote =
  "All customer enquiries and lead notifications are delivered through WhatsApp. Businesses are advised to maintain an active and regularly monitored WhatsApp number to ensure timely responses and maximize lead conversion opportunities.";

export const DEFAULT_NOTES = `${importantNote} One free basic website is included with this quotation.`;

export const DEFAULT_QUOTATION_NAME = "Massclick";

export const paymentMethodOptions = [
  { value: "not_selected", label: "Not selected" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "phonepe", label: "PhonePe" },
  { value: "other", label: "Other" },
];

export const normalizeFormItems = (items = []) => {
  const sourceItems = Array.isArray(items) && items.length ? items : [MASSCLICK_PRODUCT_ITEM];
  return sourceItems.map((item) => ({
    description: String(item.description || MASSCLICK_PRODUCT_ITEM.description),
    quantity: item.quantity ?? MASSCLICK_PRODUCT_ITEM.quantity,
    unitPrice: item.unitPrice ?? MASSCLICK_PRODUCT_ITEM.unitPrice,
  }));
};

export const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  })}`;

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const calculateTotals = (quotation) => {
  const subtotal = (quotation.items || []).reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
  const discount = Number(quotation.discount || 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = taxable * (Number(quotation.taxRate || 0) / 100);
  const total = taxable + tax;
  const advancePayment = Math.min(Math.max(Number(quotation.advancePayment || 0), 0), total);
  const balanceDue = Math.max(total - advancePayment, 0);
  const paymentStatus = advancePayment <= 0 ? "unpaid" : balanceDue <= 0 ? "paid" : "part_paid";
  return { subtotal, discount, taxable, tax, total, advancePayment, balanceDue, paymentStatus };
};

export const paymentStatusLabel = (status) => {
  if (status === "paid") return "Paid";
  if (status === "part_paid") return "Part Paid";
  return "Unpaid";
};

export const paymentMethodLabel = (value) =>
  paymentMethodOptions.find((option) => option.value === value)?.label || "Not selected";
