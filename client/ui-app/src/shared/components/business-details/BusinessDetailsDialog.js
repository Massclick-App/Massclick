import React from "react";
import {
  Avatar, Box, Button, Chip, Dialog, DialogContent, IconButton,
  Link, Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

const empty = value => value == null || value === "" || value === "-";
const text = value => {
  if (empty(value)) return "";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  if (typeof value === "object") return value.name || value.categoryName || value.locationName || value.userName || value.email || "";
  return String(value);
};
const cleanHtml = value => text(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const formatDate = value => {
  const raw = value?.$date || value;
  if (!raw) return "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? text(raw) : date.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const Section = ({ title, children }) => (
  <Box sx={{ p: 2.5, border: "1px solid #e7ebf0", borderRadius: 2.5, bgcolor: "#fff" }}>
    <Typography sx={{ mb: 1.25, color: "#64748b", fontWeight: 800, fontSize: ".75rem", letterSpacing: 1, textTransform: "uppercase" }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const Detail = ({ label, value, href }) => {
  const display = text(value);
  if (!display) return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "145px minmax(0,1fr)" }, gap: { xs: .25, sm: 2 }, py: .8, borderBottom: "1px solid #f1f3f6", "&:last-child": { borderBottom: 0 } }}>
      <Typography sx={{ color: "#64748b", fontSize: ".84rem", fontWeight: 600 }}>{label}</Typography>
      {href ? (
        <Link href={href} target="_blank" rel="noopener noreferrer" sx={{ color: "#0f766e", fontSize: ".86rem", fontWeight: 600, wordBreak: "break-all" }}>{display}</Link>
      ) : (
        <Typography sx={{ color: "#172033", fontSize: ".86rem", fontWeight: 600, wordBreak: "break-word" }}>{display}</Typography>
      )}
    </Box>
  );
};

export default function BusinessDetailsDialog({ open, row, onClose, onDownloadQr }) {
  if (!row) return null;
  const payment = Array.isArray(row.payment) ? row.payment[row.payment.length - 1] : row.payment;
  const paymentStatus = payment?.paymentStatus || (row.amountPaid ? "Paid" : "Pending");
  const createdBy = row.createdByDisplay || text(row.createdBy);
  const socialLinks = [
    ["Website", row.website], ["Google Map", row.googleMap], ["Facebook", row.facebook],
    ["Instagram", row.instagram], ["YouTube", row.youtube], ["LinkedIn", row.linkedin],
    ["Pinterest", row.pinterest], ["Twitter / X", row.twitter],
  ].filter(([, value]) => !empty(value));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: "94vh" } }}>
      <Box sx={{ p: { xs: 2.5, sm: 3 }, display: "flex", gap: 2, alignItems: "center", borderBottom: "1px solid #e7ebf0" }}>
        <Avatar src={row.logoImage || row.bannerImage} alt={row.businessName} sx={{ width: 58, height: 58, borderRadius: 2, bgcolor: "#fff3e0" }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1.2rem", sm: "1.45rem" }, color: "#0f172a", lineHeight: 1.25 }}>{text(row.businessName) || "Business details"}</Typography>
          <Typography sx={{ color: "#64748b", mt: .4, fontSize: ".86rem" }}>{text(row.clientId) || text(row._id)}</Typography>
          <Box sx={{ display: "flex", gap: .75, mt: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={row.activeBusinesses ? "Active" : "Inactive"} color={row.activeBusinesses ? "success" : "default"} />
            <Chip size="small" label={paymentStatus} color={String(paymentStatus).toLowerCase() === "paid" ? "success" : "warning"} variant="outlined" />
            {row.verification?.isVerified && <Chip size="small" label="Verified" color="primary" variant="outlined" />}
          </Box>
        </Box>
        <IconButton onClick={onClose} aria-label="Close business details"><CloseRoundedIcon /></IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#f8fafc" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <Section title="Business information">
            <Detail label="Client ID" value={row.clientId} />
            <Detail label="Business name" value={row.businessName} />
            <Detail label="Category" value={row.category} />
            <Detail label="Location" value={row.location} />
            <Detail label="Experience" value={row.experience} />
            <Detail label="GSTIN" value={row.gstin} />
          </Section>
          <Section title="Contact information">
            <Detail label="Contact" value={row.contact} />
            <Detail label="Other contacts" value={row.contactList} />
            <Detail label="WhatsApp" value={row.whatsappNumber} />
            <Detail label="Email" value={row.email} href={row.email ? `mailto:${row.email}` : ""} />
          </Section>
          <Section title="Address details">
            <Detail label="Plot / Door no." value={row.plotNumber} />
            <Detail label="Street" value={row.street} />
            <Detail label="Area / Location" value={row.location} />
            <Detail label="District" value={row.masterLocation?.district || row.district} />
            <Detail label="Pincode" value={row.pincode} />
            <Detail label="Google Map" value={row.googleMap} href={row.googleMap} />
          </Section>
          <Section title="Record & payment">
            <Detail label="Created" value={formatDate(row.createdAt)} />
            <Detail label="Created by" value={createdBy} />
            <Detail label="Payment status" value={paymentStatus} />
            <Detail label="Amount" value={payment?.amount ?? row.subscription?.price} />
            <Detail label="Paid date" value={formatDate(row.paidDate || payment?.createdAt)} />
            <Detail label="Public ID" value={row.publicId} />
          </Section>
          {cleanHtml(row.businessDetails) && (
            <Box sx={{ gridColumn: "1 / -1" }}><Section title="Business description"><Typography sx={{ color: "#334155", fontSize: ".9rem", lineHeight: 1.7 }}>{cleanHtml(row.businessDetails)}</Typography></Section></Box>
          )}
          <Section title="SEO & discovery">
            <Detail label="SEO title" value={row.seoTitle} />
            <Detail label="SEO description" value={row.seoDescription} />
            <Detail label="Keywords" value={row.keywords} />
            <Detail label="Filters" value={row.filters} />
          </Section>
          <Section title="Online links">
            {socialLinks.length ? socialLinks.map(([label, value]) => <Detail key={label} label={label} value={value} href={value} />) : <Typography sx={{ color: "#94a3b8", fontSize: ".86rem" }}>No online links added.</Typography>}
          </Section>
          {(row.bannerImage || row.qrImage) && (
            <Box sx={{ gridColumn: "1 / -1" }}><Section title="Images & review QR">
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, flexWrap: "wrap" }}>
                {row.bannerImage && <Avatar src={row.bannerImage} variant="rounded" sx={{ width: 150, height: 90 }} />}
                {row.qrImage && <Avatar src={row.qrImage} variant="square" sx={{ width: 100, height: 100, bgcolor: "white" }} />}
                {row.qrImage && <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => onDownloadQr?.(row)} sx={{ color: "#ff7a00", borderColor: "#ff7a00", textTransform: "none" }}>Download QR</Button>}
              </Box>
            </Section></Box>
          )}
        </Box>
      </DialogContent>
      <Box sx={{ px: 3, py: 1.75, borderTop: "1px solid #e7ebf0", display: "flex", justifyContent: "flex-end" }}>
        {row.website && <Button href={row.website} target="_blank" rel="noopener noreferrer" startIcon={<OpenInNewRoundedIcon />} sx={{ mr: 1, textTransform: "none", color: "#0f766e" }}>Open website</Button>}
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: "#ff7a00", textTransform: "none", "&:hover": { bgcolor: "#d46900" } }}>Close</Button>
      </Box>
    </Dialog>
  );
}
