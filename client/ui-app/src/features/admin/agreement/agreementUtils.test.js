import { agreementPrefix, agreementForm } from "./agreementUtils.js";

test("date prefix matches the server format", () => {
  expect(agreementPrefix("2026-09-15")).toBe("MC/150926/");
  expect(agreementPrefix("2027-01-02")).toBe("MC/020127/");
});

test("editing extracts only the six digit suffix", () => {
  const form = agreementForm({
    agreementNo: "MC/150926/000042",
    issueDate: "2026-09-15T00:00:00.000Z",
  });
  expect(form.agreementSequence).toBe("000042");
  expect(form.issueDate).toBe("2026-09-15");
  expect(agreementForm({ agreementNo: "MCL/001/2026" }).agreementSequence).toBe(
    "",
  );
});
