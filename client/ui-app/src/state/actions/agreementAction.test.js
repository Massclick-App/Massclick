import axiosInstance from "shared/services/axiosInstance.js";
import {
  createAgreement,
  deleteAgreement,
  getAllAgreements,
  uploadAgreementPdf,
} from "state/actions/agreementAction.js";
import agreementReducer from "state/reducers/agreementReducer.js";

jest.mock("shared/services/axiosInstance.js", () => ({
  post: jest.fn(),
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
}));
jest.mock("app/auth/authStore.js", () => ({
  getAdminAccessToken: () => "admin-token",
}));

beforeEach(() => jest.clearAllMocks());

test("PDF upload sends saved revision and updates Redux metadata", async () => {
  const record = {
    _id: "agreement-id",
    pdfKey: "agreements/agreement-id/document/example.pdf",
  };
  axiosInstance.put.mockResolvedValue({ data: record });
  const dispatch = jest.fn();
  expect(
    await uploadAgreementPdf(record._id, "pdf-data", "saved-date")(dispatch),
  ).toEqual(record);
  expect(axiosInstance.put.mock.calls[0][1]).toEqual({
    pdfFile: "pdf-data",
    updatedAt: "saved-date",
  });
  expect(dispatch.mock.calls[1][0].payload.pdfKey).toBe(record.pdfKey);
});

test("PDF upload failure is propagated so the form can offer retry", async () => {
  axiosInstance.put.mockRejectedValue(new Error("Upload failed"));
  const dispatch = jest.fn();
  await expect(
    uploadAgreementPdf("agreement-id", "pdf-data", "saved-date")(dispatch),
  ).rejects.toThrow("Upload failed");
  expect(dispatch.mock.calls[1][0].type).toBe("EDIT_AGREEMENT_FAILURE");
});

test("create unwraps the helper response for the form and reducer", async () => {
  const agreement = { _id: "agreement-id", agreementNo: "MCL/001/2026" };
  axiosInstance.post.mockResolvedValue({
    data: { message: "Created", agreement },
  });
  const dispatch = jest.fn();
  expect(await createAgreement(agreement)(dispatch)).toEqual(agreement);
  const state = agreementReducer(undefined, dispatch.mock.calls[1][0]);
  expect(state.agreements).toEqual([agreement]);
  expect(state.total).toBe(1);
});

test("delete consumes the result document and removes its row", async () => {
  const result = { _id: "agreement-id", isDeleted: true, isActive: false };
  axiosInstance.delete.mockResolvedValue({
    data: { message: "Deleted", result },
  });
  const dispatch = jest.fn();
  expect(await deleteAgreement(result._id)(dispatch)).toEqual(result);
  const initial = {
    ...agreementReducer(undefined, {}),
    agreements: [{ _id: result._id }],
    total: 1,
  };
  const state = agreementReducer(initial, dispatch.mock.calls[1][0]);
  expect(state.agreements).toEqual([]);
  expect(state.total).toBe(0);
});

test("list forwards table search, status and sorting options", async () => {
  axiosInstance.get.mockResolvedValue({ data: { data: [], total: 0 } });
  const dispatch = jest.fn();
  await getAllAgreements({
    pageNo: 2,
    pageSize: 10,
    options: {
      search: "A & B",
      status: "inactive",
      sortBy: "businessName",
      sortOrder: "asc",
    },
  })(dispatch);
  const query = new URLSearchParams(
    axiosInstance.get.mock.calls[0][0].split("?")[1],
  );
  expect(query.get("search")).toBe("A & B");
  expect(query.get("status")).toBe("inactive");
  expect(query.get("sortBy")).toBe("businessName");
  expect(query.get("sortOrder")).toBe("asc");
  expect(query.get("pageNo")).toBe("2");
});
