import nodemailer from "nodemailer";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const sendAccountDeletionRequestEmail = async ({ request, user }) => {
  const hostValue =
    process.env.ACCOUNT_DELETION_EMAIL_HOST ||
    process.env.INVOICE_EMAIL_HOST ||
    process.env.SMTP_HOST ||
    "smtp.gmail.com:587";
  const [host, rawPort] = hostValue.split(":");
  const port = Number(rawPort || 587);
  const smtpUser =
    process.env.ACCOUNT_DELETION_EMAIL_USER ||
    process.env.INVOICE_EMAIL_USER ||
    process.env.SMTP_USER;
  const smtpPassword =
    process.env.ACCOUNT_DELETION_EMAIL_PASSWORD ||
    process.env.INVOICE_EMAIL_PASSWORD ||
    process.env.SMTP_PASSWORD;
  const recipient =
    process.env.ACCOUNT_DELETION_EMAIL_TO || "support@massclick.in";
  const fromAddress =
    process.env.ACCOUNT_DELETION_EMAIL_FROM ||
    process.env.INVOICE_EMAIL_FROM ||
    smtpUser ||
    "support@massclick.in";

  if (!smtpUser || !smtpPassword) {
    throw new Error("Account deletion SMTP credentials are not configured.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });
  const requestId = String(request._id);
  const requestedAt = request.requestedAt.toISOString();
  const expectedCompletionAt = request.expectedCompletionAt.toISOString();

  return transporter.sendMail({
    from: `Massclick Account Support <${fromAddress}>`,
    to: recipient,
    subject: `Account deletion request ${requestId}`,
    text: [
      "A verified Massclick account deletion request was submitted.",
      "",
      `Request ID: ${requestId}`,
      `User ID: ${user._id}`,
      `Name: ${user.userName || "-"}`,
      `Mobile: ${user.mobileNumber1}`,
      `Email: ${user.email || "-"}`,
      `Requested at: ${requestedAt}`,
      `Target completion: ${expectedCompletionAt}`,
      "",
      "Process the account and associated-data deletion, then remove contact",
      "details from the request record. Retain only records required by law.",
    ].join("\n"),
    html: `
      <h2>Verified Massclick account deletion request</h2>
      <p>A user verified ownership by OTP and submitted a deletion request.</p>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
        <tr><th align="left">Request ID</th><td>${escapeHtml(requestId)}</td></tr>
        <tr><th align="left">User ID</th><td>${escapeHtml(user._id)}</td></tr>
        <tr><th align="left">Name</th><td>${escapeHtml(user.userName || "-")}</td></tr>
        <tr><th align="left">Mobile</th><td>${escapeHtml(user.mobileNumber1)}</td></tr>
        <tr><th align="left">Email</th><td>${escapeHtml(user.email || "-")}</td></tr>
        <tr><th align="left">Requested at</th><td>${escapeHtml(requestedAt)}</td></tr>
        <tr><th align="left">Target completion</th><td>${escapeHtml(expectedCompletionAt)}</td></tr>
      </table>
      <p>Process the account and associated-data deletion, then remove contact
      details from the request record. Retain only records required by law.</p>
    `,
  });
};
