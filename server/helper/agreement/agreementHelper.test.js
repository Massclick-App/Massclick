import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import agreementSchema from "../../schema/agreement/agreementSchema.js";
import {
  normalizeAgreementPayload,
  buildAgreementNo,
  nextAgreementNo,
  createAgreement,
} from "./agreementHelper.js";
import agreementCounterModel from "../../model/agreement/agreementCounterModel.js";
import agreementModel from "../../model/agreement/agreementModel.js";

test("number uses DDMMYY and pads only the editable sequence", () => {
  assert.equal(buildAgreementNo("2026-09-15", "1"), "MC/150926/000001");
  assert.equal(buildAgreementNo("2027-01-02", 42), "MC/020127/000042");
  for (const suffix of [0, -1, "1x", "1234567", "MC/1", "000000"]) {
    assert.throws(() => buildAgreementNo("2026-09-15", suffix), /sequence/);
  }
  assert.throws(() => buildAgreementNo("2026-02-30", 1), /date/);
});

test("number preview does not reserve the sequence", async (t) => {
  t.mock.method(agreementCounterModel, "findOne", () => ({
    lean: async () => ({ sequence: 8 }),
  }));
  assert.deepEqual(await nextAgreementNo("2026-09-15"), {
    agreementNo: "MC/150926/000009",
    agreementSequence: "000009",
  });
});

test("automatic creates reserve different numbers and ignore client prefixes", async (t) => {
  let sequence = 0;
  t.mock.method(
    agreementCounterModel,
    "findOneAndUpdate",
    async (query, update) => {
      assert.deepEqual(update, { $inc: { sequence: 1 } });
      return { sequence: ++sequence };
    },
  );
  t.mock.method(agreementModel.prototype, "save", async function () {
    return this;
  });
  const records = await Promise.all([
    createAgreement(valid()),
    createAgreement(valid()),
  ]);
  assert.deepEqual(
    records.map((record) => record.agreement.agreementNo),
    ["MC/150926/000001", "MC/150926/000002"],
  );
});

test("manual suffix advances the counter without allowing prefix changes", async (t) => {
  const reserve = t.mock.method(
    agreementCounterModel,
    "findOneAndUpdate",
    async () => ({ sequence: 42 }),
  );
  t.mock.method(agreementModel.prototype, "save", async function () {
    return this;
  });
  const record = await createAgreement({
    ...valid(),
    agreementNo: "OTHER/123",
    agreementSequence: "42",
  });
  assert.equal(record.agreement.agreementNo, "MC/150926/000042");
  assert.deepEqual(reserve.mock.calls[0].arguments[1], {
    $max: { sequence: 42 },
  });
});

const valid = () => ({
  agreementNo: "MCL/001/2026",
  issueDate: "2026-09-15",
  place: "Trichy",
  amount: "24000",
  taxRate: "18",
  businessName: "Business",
  clientName: "Owner",
  clientAddress: "Address",
  clientDate: "2026-09-15",
  clientPlace: "Trichy",
  companyName: "M. Muruganantham",
  companyDesignation: "Managing Director",
  companyDate: "2026-09-15",
  companyPlace: "Trichy",
});
const Agreement = mongoose.model("AgreementValidationTest", agreementSchema);
test("normalizes amounts, trims text and excludes protected fields", () => {
  const result = normalizeAgreementPayload({
    ...valid(),
    businessName: " Business ",
    createdBy: "attacker",
    total: 1,
    $set: { amount: 1 },
  });
  assert.equal(result.amount, 24000);
  assert.equal(result.businessName, "Business");
  assert.equal(result.createdBy, undefined);
  assert.equal(result.$set, undefined);
  assert.equal(result.total, undefined);
  assert.equal(new Agreement(result).validateSync(), undefined);
});
test("rejects invalid and impossible dates", () => {
  for (const value of ["2026-02-30", "invalid", "", null, "2026-13-01"]) {
    assert.throws(
      () => normalizeAgreementPayload({ ...valid(), clientDate: value }),
      /valid date/,
    );
  }
});
test("rejects invalid monetary values and tax rates", () => {
  for (const amount of [-1, Infinity, "NaN", "", null, {}, 100000001]) {
    assert.throws(
      () => normalizeAgreementPayload({ ...valid(), amount }),
      /amount is invalid/,
    );
  }
  assert.throws(
    () => normalizeAgreementPayload({ ...valid(), taxRate: 101 }),
    /taxRate is invalid/,
  );
  assert.equal(normalizeAgreementPayload({ ...valid(), amount: 0 }).amount, 0);
});
test("schema requires business details and bounds document text", () => {
  for (const field of [
    "agreementNo",
    "businessName",
    "clientAddress",
    "companyName",
    "clientPlace",
  ]) {
    const payload = normalizeAgreementPayload({ ...valid(), [field]: "" });
    assert.ok(new Agreement(payload).validateSync()?.errors[field]);
  }
  assert.ok(
    new Agreement(
      normalizeAgreementPayload({ ...valid(), clientAddress: "a".repeat(241) }),
    ).validateSync()?.errors.clientAddress,
  );
});
