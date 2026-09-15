import test, { beforeEach } from "node:test";
import agreementCounterModel from "../../model/agreement/agreementCounterModel.js";
beforeEach((t) => {
  t.mock.method(agreementCounterModel, "findOneAndUpdate", async () => ({
    sequence: 1,
  }));
});
import assert from "node:assert/strict";
import agreementModel from "../../model/agreement/agreementModel.js";
import {
  addAgreementAction,
  updateAgreementAction,
  viewAllAgreementsAction,
  viewAgreementAction,
  deleteAgreementAction,
} from "./agreementController.js";

const body = () => ({
  agreementNo: "MC/150926/000001",
  agreementSequence: "000001",
  issueDate: "2026-09-15",
  place: "Trichy",
  amount: 24000,
  taxRate: 18,
  businessName: "Business",
  clientAddress: "Address",
  clientDate: "2026-09-15",
  clientPlace: "Trichy",
  companyName: "Representative",
  companyDesignation: "Director",
  companyDate: "2026-09-15",
  companyPlace: "Trichy",
});
const response = () => ({
  code: 200,
  status(code) {
    this.code = code;
    return this;
  },
  send(value) {
    this.value = value;
    return this;
  },
});

test("create uses authenticated creator and returns the existing create response shape", async (t) => {
  t.mock.method(agreementModel.prototype, "save", async function () {
    return this;
  });
  const res = response();
  await addAgreementAction(
    {
      body: { ...body(), createdBy: "forged" },
      authActor: { subjectId: "507f1f77bcf86cd799439011" },
    },
    res,
  );
  assert.equal(res.code, 200);
  assert.equal(
    String(res.value.agreement.createdBy),
    "507f1f77bcf86cd799439011",
  );
});
test("duplicate agreement number returns the existing BAD_REQUEST response", async (t) => {
  t.mock.method(agreementModel.prototype, "save", async () => {
    throw Object.assign(new Error(), { code: 11000 });
  });
  const res = response();
  await addAgreementAction(
    { body: body(), authActor: { subjectId: "507f1f77bcf86cd799439011" } },
    res,
  );
  assert.equal(res.code, 400);
});
test("invalid amounts are rejected before accessing the database", async (t) => {
  const create = t.mock.method(
    agreementModel.prototype,
    "save",
    async () => ({}),
  );
  const res = response();
  await addAgreementAction({ body: { ...body(), amount: -1 } }, res);
  assert.equal(res.code, 400);
  assert.equal(create.mock.callCount(), 0);
});
test("update validates fields and reports a missing record", async (t) => {
  const update = t.mock.method(agreementModel, "findOneAndUpdate", () => ({
    lean: async () => null,
  }));
  const res = response();
  await updateAgreementAction(
    { params: { id: "507f1f77bcf86cd799439011" }, body: body() },
    res,
  );
  assert.equal(res.code, 400);
  assert.equal(update.mock.calls[0].arguments[2].runValidators, true);
});
test("list caps pagination and treats search metacharacters literally", async (t) => {
  let captured;
  const query = {
    sort() {
      return this;
    },
    skip(n) {
      assert.equal(n, 0);
      return this;
    },
    limit(n) {
      assert.equal(n, 100);
      return this;
    },
    async lean() {
      return [];
    },
  };
  t.mock.method(agreementModel, "find", (filter) => {
    captured = filter;
    return query;
  });
  t.mock.method(agreementModel, "countDocuments", async () => 0);
  const res = response();
  await viewAllAgreementsAction(
    { query: { pageNo: -1, pageSize: 500, search: "[a]+" } },
    res,
  );
  assert.equal(captured.$or[0].agreementNo.$regex, "\\[a\\]\\+");
  assert.deepEqual(res.value.data, []);
  assert.equal(res.value.pageSize, 100);
});
test("invalid IDs return BAD_REQUEST through the helper", async () => {
  const res = response();
  await viewAgreementAction({ params: { id: "invalid" } }, res);
  assert.equal(res.code, 400);
  assert.equal(res.value.message, "Invalid agreement ID");
});
test("delete soft-deletes the agreement and returns result", async (t) => {
  const id = "507f1f77bcf86cd799439011";
  const update = t.mock.method(
    agreementModel,
    "findOneAndUpdate",
    (query, data) => ({ lean: async () => ({ _id: id, ...data }) }),
  );
  const res = response();
  await deleteAgreementAction({ params: { id } }, res);
  assert.equal(res.value.result.isDeleted, true);
  assert.equal(res.value.result.isActive, false);
  assert.deepEqual(update.mock.calls[0].arguments[0], {
    _id: id,
    isDeleted: { $ne: true },
  });
});
