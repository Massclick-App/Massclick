import agreementModel from "../../model/agreement/agreementModel.js";
import { viewAgreement } from "./agreementHelper.js";

const MAX_PDF_SIZE = 5 * 1024 * 1024;

export const validateAgreementPdf = (pdfFile) => {
  if (
    typeof pdfFile !== "string" ||
    pdfFile.length > Math.ceil((MAX_PDF_SIZE * 4) / 3) + 100
  ) {
    throw new Error("Agreement PDF must be 5 MB or smaller");
  }
  const match = /^data:application\/pdf;base64,([A-Za-z0-9+/]+={0,2})$/.exec(
    pdfFile,
  );
  if (!match) throw new Error("A PDF file is required");
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length > MAX_PDF_SIZE)
    throw new Error("Agreement PDF must be 5 MB or smaller");
  if (
    buffer.subarray(0, 5).toString() !== "%PDF-" ||
    !buffer.subarray(-1024).includes(Buffer.from("%%EOF"))
  ) {
    throw new Error("Invalid PDF file");
  }
  return buffer;
};

export const uploadAgreementPdf = async (id, data = {}) => {
  const buffer = validateAgreementPdf(data.pdfFile);
  const existing = await viewAgreement(id);
  if (
    !data.updatedAt ||
    new Date(data.updatedAt).getTime() !==
      new Date(existing.updatedAt).getTime()
  ) {
    throw new Error("Agreement changed. Reload it before uploading the PDF.");
  }
  const { uploadImageToS3, deleteObjectByKey } =
    await import("../../s3Uploder.js");
  const { s3Keys } = await import("../../utils/s3ObjectKeys.js");
  const uploaded = await uploadImageToS3(
    buffer,
    s3Keys.agreement.document(id),
    {
      skipImageConversion: true,
      contentType: "application/pdf",
      extension: "pdf",
    },
  );
  let agreement;
  try {
    agreement = await agreementModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true }, updatedAt: existing.updatedAt },
        {
          $set: {
            pdfKey: uploaded.key,
            pdfFileName: `${existing.agreementNo.replace(/[^a-z0-9-]+/gi, "-")}.pdf`,
            pdfSize: buffer.length,
            pdfUploadedAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      )
      .lean();
    if (!agreement)
      throw new Error("Agreement changed. Reload it before uploading the PDF.");
  } catch (error) {
    await deleteObjectByKey(uploaded.key).catch((cleanupError) =>
      console.error("Agreement PDF cleanup failed:", cleanupError),
    );
    throw error;
  }
  return agreement;
};

export const viewAgreementPdf = async (id) => {
  const agreement = await viewAgreement(id);
  if (!agreement.pdfKey)
    throw new Error(
      "No PDF stored for this agreement. Save it to upload a PDF.",
    );
  const { getSignedUrlByKey } = await import("../../s3Uploder.js");
  return {
    pdfUrl: getSignedUrlByKey(agreement.pdfKey, { signed: true, expiry: 300 }),
    fileName: agreement.pdfFileName,
  };
};
