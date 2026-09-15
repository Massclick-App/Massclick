# Business agreements

Admin page: `/dashboard/agreement`, under **Manage → Agreements**. The page is included in the page permission registry; assign it to staff roles through the existing role editor. Superadmins can access it immediately.

All endpoints require an admin bearer token. Data is stored in `massclick_agreement` using the existing MongoDB connection.

| Method | Endpoint | Result |
| --- | --- | --- |
| POST | `/api/agreement/create` | `{ message, agreement }` (200) |
| GET | `/api/agreement/next-number?issueDate=2026-09-15` | `{ agreementNo: "MC/150926/000001", agreementSequence: "000001" }` (preview only) |
| GET | `/api/agreement/viewall?pageNo=1&pageSize=10&search=...` | `{ data, total, pageNo, pageSize }` |
| GET | `/api/agreement/view/:id` | One document |
| PUT | `/api/agreement/update/:id` | Replace editable fields, return saved document |
| DELETE | `/api/agreement/delete/:id` | Soft delete, return `{ message, result }` |

Create/update body:

```json
{
  "agreementSequence": "000001",
  "issueDate": "2026-09-15",
  "place": "Tiruchirappalli, Tamil Nadu, India",
  "amount": 24000,
  "taxRate": 18,
  "businessName": "Example Business",
  "clientName": "Example Owner",
  "clientAddress": "Business address",
  "clientDate": "2026-09-15",
  "clientPlace": "Tiruchirappalli",
  "companyName": "M. Muruganantham",
  "companyDesignation": "Managing Director",
  "companyDate": "2026-09-15",
  "companyPlace": "Tiruchirappalli, Tamil Nadu, India",
  "isActive": true
}
```

The implementation follows the Advertisement/Documents structure: routes call explicit controller actions, controllers call CRUD helpers, helpers validate and query the model, and the model uses `MASSCLICKAGREEMENT` from `collectionName.js`. The explicit collection argument preserves the original `massclick_agreement` collection. Admin authentication remains enforced on each route.

Numbers use `MC/DDMMYY/000001`, with the date derived from `issueDate`. The prefix/date cannot be supplied through `agreementNo`. Omit `agreementSequence` on create to reserve the next number atomically at save time. The sequence is continuous across dates and does not reset daily. The preview does not reserve a number. Supply 1–6 digits (1–999999) to override the suffix; the server pads it to six digits and advances the counter when necessary. Duplicate full numbers, including deleted agreements, are rejected. Updates without a suffix preserve the existing sequence; older formats remain unchanged unless a suffix is supplied. The admin form offers only the suffix for editing and displays the fixed date prefix beside it.

Duplicate numbers, invalid fields/IDs and missing documents use the existing `BAD_REQUEST.code` and `{ message }` error convention. `clientName` is optional. Dates use YYYY-MM-DD. Unknown fields, including caller-supplied creator IDs and deletion flags, are ignored. Amount and GST are nonnegative and limited; GST and totals are calculated to two decimals in the document.

List options also accept `status=all|active|inactive`, `sortBy`, and `sortOrder=asc|desc`. Redux uses `getAllAgreements({ pageNo, pageSize, options })` and the `state.agreement` reducer. Deletion sets `isDeleted: true` and `isActive: false`; deleted agreements cannot be viewed or edited. Older records without these flags remain visible without a migration.

The browser generates the A4 PDF using the same React document as the preview, with existing html2canvas/jsPDF dependencies. The 2× capture is encoded as JPEG at 0.88 quality with PDF compression enabled, avoiding the large uncompressed PNG bitmap. Save & Download first persists the form. Table downloads export the saved record. Long content is fitted onto a single A4 page without cropping. Signature lines are blank. The fixed agreement wording is transcribed from the supplied reference; the logo uses the repository asset. The preview fits the available width and its typography is isolated from the admin panel headings and paragraphs.

Validation tests: `node --test server/helper/agreement/agreementHelper.test.js server/controller/agreement/agreementController.test.js` from the repository root. No live database is needed for these tests.
