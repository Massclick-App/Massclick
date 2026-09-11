import { useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, TextField } from "@mui/material";
import { Send } from "lucide-react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { formatIndianMobile, normalizeIndianMobile, toMobileInputValue } from "shared/utils/indianMobile.js";
import styles from "features/admin/search-requests/SendCompletedMessageDialog.module.css";

const cx = createScopedClassNames(styles);
const formId = "send-completed-message-form";
const invalidMobileMessage = "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.";
// Order matches the MSG91 template variables {{1}}..{{4}}.
const templateFields = [
  { name: "fullName", label: "Customer name", maxLength: 100 },
  { name: "category", label: "Service", maxLength: 120 },
  { name: "location", label: "Location", maxLength: 180 },
  { name: "supportContact", label: "Support contact", maxLength: 150 },
];

const buildInitialValues = (request, defaults) => ({
  contactNumber: toMobileInputValue(request.contactNumber),
  fullName: request.fullName || "",
  category: request.category || "",
  location: request.location || "",
  supportContact: defaults?.supportContact || "",
});

const validate = (values) => {
  const errors = {};
  if (!normalizeIndianMobile(values.contactNumber)) errors.contactNumber = invalidMobileMessage;
  templateFields.forEach(({ name, label }) => {
    if (!values[name].trim()) errors[name] = `${label} is required.`;
  });
  return errors;
};

const renderPreview = (template, values) => template.split(/(\{\{\d\}\})/).map((part, index) => {
  const token = part.match(/^\{\{(\d)\}\}$/);
  if (!token) return part;
  const value = values[templateFields[Number(token[1]) - 1]?.name]?.trim().replace(/\s+/g, " ");
  return <mark key={index} className={cx("preview-value", !value && "preview-value--empty")}>{value || part}</mark>;
});

export default function SendCompletedMessageDialog({ open, request, defaults, template, sending, onClose, onSend }) {
  const [values, setValues] = useState(() => buildInitialValues(request, defaults));
  const errors = useMemo(() => validate(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;
  const submittedNumber = String(request.contactNumber || "");
  const numberWasCorrected = submittedNumber && submittedNumber !== values.contactNumber;

  const handleChange = ({ target: { name, value } }) => {
    setValues((current) => ({ ...current, [name]: name === "contactNumber" ? toMobileInputValue(value) : value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (hasErrors || sending) return;
    onSend({
      contactNumber: normalizeIndianMobile(values.contactNumber),
      fullName: values.fullName.trim(),
      category: values.category.trim(),
      location: values.location.trim(),
      supportContact: values.supportContact.trim(),
    });
  };

  const numberHelper = errors.contactNumber
    ? `${numberWasCorrected ? `Customer entered ${submittedNumber} · ` : ""}${errors.contactNumber}`
    : `${numberWasCorrected ? `Customer entered ${submittedNumber} · ` : ""}Sending to ${formatIndianMobile(values.contactNumber)}`;

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="send-completed-message-title">
      <DialogTitle id="send-completed-message-title">Send completed message</DialogTitle>
      <DialogContent>
        <form id={formId} onSubmit={handleSubmit} noValidate>
          <p className={cx("intro")}>Check these values before sending. They fill the WhatsApp template exactly as shown in the preview, and a corrected number is saved to this request.</p>
          <div className={cx("fields")}>
            <TextField
              className={cx("field-wide")}
              label="WhatsApp number"
              name="contactNumber"
              value={values.contactNumber}
              onChange={handleChange}
              error={Boolean(errors.contactNumber)}
              helperText={numberHelper}
              disabled={sending}
              autoFocus={Boolean(errors.contactNumber)}
              fullWidth
              slotProps={{
                input: { startAdornment: <InputAdornment position="start">+91</InputAdornment> },
                htmlInput: { inputMode: "numeric", autoComplete: "off" },
              }}
            />
            {templateFields.map(({ name, label, maxLength }, index) => (
              <TextField
                key={name}
                label={`${label} {{${index + 1}}}`}
                name={name}
                value={values[name]}
                onChange={handleChange}
                error={Boolean(errors[name])}
                helperText={errors[name] || " "}
                disabled={sending}
                fullWidth
                slotProps={{ htmlInput: { maxLength } }}
              />
            ))}
          </div>
          <section className={cx("preview-block")} aria-label="WhatsApp message preview">
            <span className={cx("preview-label")}>WhatsApp preview</span>
            <p className={cx("preview")}>{renderPreview(template, values)}</p>
          </section>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>Cancel</Button>
        <Button type="submit" form={formId} variant="contained" startIcon={<Send size={15} />} disabled={hasErrors || sending}>
          {sending ? "Sending..." : "Send on WhatsApp"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
