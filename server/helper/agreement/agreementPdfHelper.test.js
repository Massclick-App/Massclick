import test from "node:test";
import assert from "node:assert/strict";
import AWS from "aws-sdk";
import agreementModel from "../../model/agreement/agreementModel.js";
import {
  validateAgreementPdf,
  uploadAgreementPdf,
} from "./agreementPdfHelper.js";

const id = "507f1f77bcf86cd799439011";
const updatedAt = new Date("2026-09-15T10:00:00Z");
const pdfFile = `data:application/pdf;base64,${Buffer.from("%PDF-1.3\nmock PDF\n%%EOF").toString("base64")}`;

test("PDF validation rejects other files and oversized requests", () => {
  assert.ok(
    validateAgreementPdf(pdfFile).subarray(0, 5).equals(Buffer.from("%PDF-")),
  );
  for (const value of [
    "data:image/png;base64,AAAA",
    "data:application/pdf;base64,YWJj",
    "bad",
  ]) {
    assert.throws(() => validateAgreementPdf(value));
  }
  assert.throws(
    () => validateAgreementPdf("a".repeat(8 * 1024 * 1024)),
    /5 MB/,
  );
});

test("stale PDF is rejected before uploading", async (t) => {
  t.mock.method(agreementModel, "findOne", () => ({
    lean: async () => ({ _id: id, updatedAt }),
  }));
  await assert.rejects(
    uploadAgreementPdf(id, { pdfFile, updatedAt: "2020-01-01" }),
    /Agreement changed/,
  );
});

test("upload uses the shared bucket/key format and records PDF metadata", async (t) => {
  process.env.AWS_S3_BUCKET_MASSCLICK = "agreement-test-bucket";
  process.env.AWS_REGION = "ap-south-1";
  let uploaded;
  t.mock.method(AWS.S3.prototype, "upload", function (params) {
    uploaded = params;
    return { promise: async () => ({}) };
  });
  t.mock.method(agreementModel, "findOne", () => ({
    lean: async () => ({ _id: id, updatedAt, agreementNo: "MC/150926/000001" }),
  }));
  const update = t.mock.method(
    agreementModel,
    "findOneAndUpdate",
    (query, changes) => ({ lean: async () => ({ _id: id, ...changes.$set }) }),
  );
  const record = await uploadAgreementPdf(id, {
    pdfFile,
    updatedAt: updatedAt.toISOString(),
  });
  assert.equal(uploaded.Bucket, "agreement-test-bucket");
  assert.match(
    uploaded.Key,
    new RegExp(`^agreements/${id}/document/[A-Z0-9]+\\.pdf$`),
  );
  assert.equal(uploaded.ContentType, "application/pdf");
  assert.equal(record.pdfKey, uploaded.Key);
  assert.equal(record.pdfSize, uploaded.Body.length);
  assert.equal(record.pdfFileName, "MC-150926-000001.pdf");
  assert.equal(update.mock.calls[0].arguments[0].updatedAt, updatedAt);
});

test("S3 failure does not mark the PDF as stored", async (t) => {
  t.mock.method(AWS.S3.prototype, "upload", () => ({
    promise: async () => {
      throw new Error("Upload unavailable");
    },
  }));
  t.mock.method(agreementModel, "findOne", () => ({
    lean: async () => ({ _id: id, updatedAt, agreementNo: "MC/150926/000001" }),
  }));
  const update = t.mock.method(agreementModel, "findOneAndUpdate", () =>
    assert.fail("Must not update metadata"),
  );
  await assert.rejects(
    uploadAgreementPdf(id, { pdfFile, updatedAt: updatedAt.toISOString() }),
    /Upload unavailable/,
  );
  assert.equal(update.mock.callCount(), 0);
});
