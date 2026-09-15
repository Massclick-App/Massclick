import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AdminViewTabs from "shared/components/AdminViewTabs.js";
import CustomizedTable from "shared/components/table/CustomizedTable.js";
import {
  createAgreement,
  editAgreement,
  deleteAgreement,
  getAllAgreements,
  getNextAgreementNo,
  uploadAgreementPdf,
  getAgreementPdf,
  getAgreement,
} from "state/actions/agreementAction.js";
import AgreementPreview from "features/admin/agreement/AgreementPreview.js";
import {
  agreementForm,
  newAgreement,
  money,
  totals,
  dateLabel,
  agreementPrefix,
} from "features/admin/agreement/agreementUtils.js";
import styles from "features/admin/agreement/agreement.module.css";
const cx = createScopedClassNames(styles);
const groups = [
  [
    "Agreement details",
    [
      ["agreementSequence", "Agreement number", "text", 6],
      ["issueDate", "Agreement date", "date"],
      ["place", "Agreement place", "text", 120],
      ["amount", "Product amount (₹)", "number"],
      ["taxRate", "GST (%)", "number"],
    ],
  ],
  [
    "Client / Business Owner",
    [
      ["businessName", "Business name", "text", 120],
      ["clientName", "Owner / representative name (optional)", "text", 100],
      ["clientAddress", "Business address", "text", 240],
      ["clientDate", "Client date", "date"],
      ["clientPlace", "Client place", "text", 120],
    ],
  ],
  [
    "For MassClick Technologies Pvt Ltd",
    [
      ["companyName", "Authorized representative", "text", 100],
      ["companyDesignation", "Designation", "text", 100],
      ["companyDate", "MassClick date", "date"],
      ["companyPlace", "MassClick place", "text", 120],
    ],
  ],
];
const errorMessage = (error) =>
  error.response?.data?.message ||
  error.message ||
  "Unable to complete the request.";
export default function Agreement() {
  const dispatch = useDispatch();
  const {
    agreements = [],
    total = 0,
    loading,
  } = useSelector((state) => state.agreement || {});
  const [activeView, setActiveView] = useState("list");
  const [formData, setFormData] = useState(newAgreement);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [remove, setRemove] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [numberLoading, setNumberLoading] = useState(false);
  const [sequenceEdited, setSequenceEdited] = useState(false);
  const [numberRequest, setNumberRequest] = useState(0);
  const hasNumber = /^MC\/\d{6}\/\d{6}$/.test(formData.agreementNo);
  const displayAgreement = {
    ...formData,
    agreementNo: formData.agreementSequence
      ? `${agreementPrefix(formData.issueDate)}${formData.agreementSequence.padStart(6, "0")}`
      : formData.agreementNo,
  };

  useEffect(() => {
    if (
      activeView !== "form" ||
      sequenceEdited ||
      (editingId && hasNumber) ||
      !formData.issueDate
    )
      return;
    let cancelled = false;
    setNumberLoading(true);
    dispatch(getNextAgreementNo(formData.issueDate))
      .then((result) => {
        if (!cancelled)
          setFormData((previous) => ({
            ...previous,
            agreementSequence: result.agreementSequence,
          }));
      })
      .catch((error) => {
        if (!cancelled)
          setMessage({ type: "error", text: errorMessage(error) });
      })
      .finally(() => {
        if (!cancelled) setNumberLoading(false);
      });
    return () => {
      cancelled = true;
      setNumberLoading(false);
    };
  }, [
    dispatch,
    activeView,
    editingId,
    hasNumber,
    formData.issueDate,
    sequenceEdited,
    numberRequest,
  ]);
  const fetchAgreements = async (pageNo, pageSize, options = {}) => {
    try {
      return await dispatch(
        getAllAgreements({
          pageNo,
          pageSize,
          options,
        }),
      );
    } catch (error) {
      setMessage({
        type: "error",
        text: errorMessage(error),
      });
    }
  };
  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "agreementSequence") {
      if (!/^\d{0,6}$/.test(value)) return;
      setSequenceEdited(true);
    }
    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const resetForm = () => {
    setSequenceEdited(false);
    setNumberRequest((value) => value + 1);
    setFormData(newAgreement());
    setEditingId(null);
    setMessage(null);
    setActiveView("form");
  };
  const handleEdit = (row) => {
    setSequenceEdited(false);
    setFormData(agreementForm(row));
    setEditingId(row._id);
    setMessage(null);
    setActiveView("form");
  };
  const archivePdf = async (record) => {
    const { generateAgreementPdf } =
      await import("features/admin/agreement/pdfExport.js");
    const pdf = await generateAgreementPdf(record);
    const pdfFile = `data:application/pdf;base64,${pdf.output("datauristring").split(",")[1]}`;
    const archived = await dispatch(
      uploadAgreementPdf(record._id, pdfFile, record.updatedAt),
    );
    return { pdf, archived };
  };
  const handleDownload = async (row) => {
    setBusy(true);
    try {
      // Archive only persisted data, even when opened from an unsaved form preview.
      row = await dispatch(getAgreement(row._id));
      if (row.pdfKey) {
        const { pdfUrl, fileName } = await dispatch(getAgreementPdf(row._id));
        const response = await fetch(pdfUrl);
        if (!response.ok) throw new Error("Unable to download the stored PDF.");
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const { pdf, archived } = await archivePdf(row);
        if (editingId === row._id) setFormData(agreementForm(archived));
        pdf.save(archived.pdfFileName);
        setRefresh((value) => value + 1);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (numberLoading) return;
    setBusy(true);
    let dataSaved = false;
    let pdfStored = false;
    const shouldDownload = event.nativeEvent.submitter?.value === "download";
    try {
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        taxRate: Number(formData.taxRate),
      };
      if (!editingId && !sequenceEdited) delete payload.agreementSequence;
      const saved = await dispatch(
        editingId
          ? editAgreement(editingId, payload)
          : createAgreement(payload),
      );
      setEditingId(saved._id);
      setFormData(agreementForm(saved));
      dataSaved = true;
      setMessage({ type: "info", text: "Agreement saved. Uploading PDF…" });
      const { pdf, archived } = await archivePdf(saved);
      pdfStored = true;
      setFormData(agreementForm(archived));
      setMessage({
        type: "success",
        text: "Agreement and PDF saved to AWS successfully.",
      });
      setRefresh((value) => value + 1);
      if (shouldDownload) pdf.save(archived.pdfFileName);
    } catch (error) {
      setMessage({
        type: "error",
        text: pdfStored
          ? `Agreement and PDF are stored in AWS, but the download failed. ${errorMessage(error)}`
          : dataSaved
          ? `Agreement details saved, but the PDF was not uploaded. Save again to retry. ${errorMessage(error)}`
          : errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };
  const handleDelete = async () => {
    setBusy(true);
    try {
      await dispatch(deleteAgreement(remove._id));
      if (editingId === remove._id) {
        setEditingId(null);
        setFormData(newAgreement());
      }
      setRemove(null);
      setRefresh((value) => value + 1);
      setMessage({
        type: "success",
        text: "Agreement deleted successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: errorMessage(error),
      });
    } finally {
      setBusy(false);
    }
  };
  const columns = [
    {
      id: "pdfKey",
      label: "PDF storage",
      sortable: false,
      renderCell: (value) => (
        <Chip
          size="small"
          label={value ? "Stored in AWS" : "Upload pending"}
          color={value ? "success" : "warning"}
        />
      ),
    },
    {
      id: "agreementNo",
      label: "Agreement No.",
    },
    {
      id: "businessName",
      label: "Business",
    },
    {
      id: "clientName",
      label: "Owner",
    },
    {
      id: "issueDate",
      label: "Date",
      renderCell: dateLabel,
    },
    {
      id: "place",
      label: "Place",
    },
    {
      id: "amount",
      label: "Total",
      sortable: false,
      renderCell: (_, row) => money(totals(row).total),
    },
    {
      id: "isActive",
      label: "Status",
      renderCell: (value) => (
        <Chip
          size="small"
          label={value === false ? "Inactive" : "Active"}
          color={value === false ? "default" : "success"}
        />
      ),
    },
    {
      id: "actions",
      sortable: false,
      label: "Actions",
      renderCell: (_, row) => (
        <div
          className={cx("actions")}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            size="small"
            disabled={busy || numberLoading}
            onClick={() => setPreview(row)}
          >
            View
          </Button>
          <Button
            size="small"
            disabled={busy || numberLoading}
            onClick={() => handleEdit(row)}
          >
            Edit
          </Button>
          <Button
            size="small"
            disabled={busy || numberLoading}
            onClick={() => handleDownload(row)}
          >
            Download
          </Button>
          <Button
            size="small"
            color="error"
            disabled={busy || numberLoading}
            onClick={() => setRemove(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className={cx("page")}>
      <div className={cx("toolbar")}>
        <div>
          <h1>Agreements</h1>
          <p>Create, manage and download MassClick business agreements.</p>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={busy || numberLoading}
          onClick={resetForm}
        >
          New Agreement
        </Button>
      </div>
      <AdminViewTabs
        activeView={activeView}
        onChange={(value) => !busy && setActiveView(value)}
        isEditing={Boolean(editingId)}
        createLabel="Agreement"
        listLabel="Catalogue"
        listCount={total}
      />
      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {activeView === "list" ? (
        <CustomizedTable
          key={refresh}
          title="Agreement Catalogue"
          columns={columns}
          data={agreements}
          total={total}
          fetchData={fetchAgreements}
          enableStatusFilter
          loading={loading}
          searchPlaceholder="Search agreement number, business or owner"
          onRowClick={(row) => !busy && handleEdit(row)}
        />
      ) : (
        <div className={cx("layout")}>
          <form className={cx("panel")} onSubmit={handleSubmit}>
            <fieldset
              disabled={busy || numberLoading}
              className={cx("fieldset")}
            >
              {groups.map(([title, fields]) => (
                <section key={title}>
                  <h2>{title}</h2>
                  <div className={cx("fields")}>
                    {fields.map(([name, label, type, maxLength]) => (
                      <TextField
                        key={name}
                        name={name}
                        label={label}
                        type={type}
                        value={formData[name]}
                        required={name !== "clientName"}
                        fullWidth
                        size="small"
                        multiline={name === "clientAddress"}
                        minRows={name === "clientAddress" ? 3 : undefined}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        InputProps={
                          name === "agreementSequence"
                            ? {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    {agreementPrefix(formData.issueDate)}
                                  </InputAdornment>
                                ),
                              }
                            : undefined
                        }
                        inputProps={{
                          maxLength,
                          ...(name === "agreementSequence"
                            ? { inputMode: "numeric", pattern: "0*[1-9][0-9]*" }
                            : {}),
                          ...(type === "number"
                            ? {
                                min: 0,
                                max: name === "taxRate" ? 100 : 100000000,
                                step: "0.01",
                              }
                            : {}),
                        }}
                        onChange={handleChange}
                        onBlur={
                          name === "agreementSequence"
                            ? () =>
                                setFormData((previous) => ({
                                  ...previous,
                                  agreementSequence: previous.agreementSequence
                                    ? previous.agreementSequence.padStart(
                                        6,
                                        "0",
                                      )
                                    : "",
                                }))
                            : undefined
                        }
                        helperText={
                          name === "agreementSequence"
                            ? numberLoading
                              ? "Loading next number…"
                              : "Only the last six digits are editable. Automatic numbers are confirmed when saved."
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
              <FormControlLabel
                control={
                  <Switch
                    name="isActive"
                    checked={formData.isActive !== false}
                    onChange={handleChange}
                  />
                }
                label="Active"
              />
              <div className={cx("summary")}>
                <span>GST: {money(totals(formData).tax)}</span>
                <strong>Total: {money(totals(formData).total)}</strong>
              </div>
              <div className={cx("actions")}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy || numberLoading}
                >
                  {busy
                    ? "Please wait…"
                    : editingId
                      ? "Update Agreement"
                      : "Save Agreement"}
                </Button>
                <Button
                  type="submit"
                  value="download"
                  variant="outlined"
                  disabled={busy || numberLoading}
                >
                  Save &amp; Download PDF
                </Button>
                <Button
                  type="button"
                  disabled={busy || numberLoading}
                  onClick={() => setPreview(displayAgreement)}
                >
                  Preview
                </Button>
              </div>
            </fieldset>
          </form>
          <section className={cx("previewPanel")}>
            <h2>Agreement preview</h2>
            <p>
              Your details appear in the document below. Signature spaces remain
              blank for signing.
            </p>
            <div className={cx("previewScroll")}>
              <AgreementPreview agreement={displayAgreement} />
            </div>
          </section>
        </div>
      )}
      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        maxWidth={false}
        fullWidth
      >
        <DialogTitle>Business Agreement</DialogTitle>
        <DialogContent>
          {preview && <AgreementPreview agreement={preview} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close</Button>
          {preview?._id && (
            <Button
              disabled={busy || numberLoading}
              onClick={() => handleDownload(preview)}
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(remove)} onClose={() => !busy && setRemove(null)}>
        <DialogTitle>Delete agreement?</DialogTitle>
        <DialogContent>
          Delete {remove?.agreementNo} for {remove?.businessName}? It will be
          removed from the agreement catalogue.
        </DialogContent>
        <DialogActions>
          <Button
            disabled={busy || numberLoading}
            onClick={() => setRemove(null)}
          >
            Cancel
          </Button>
          <Button
            color="error"
            disabled={busy || numberLoading}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
