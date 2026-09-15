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
| PUT | `/api/agreement/pdf/:id` | Upload `{ pdfFile, updatedAt }`; return agreement with PDF metadata |
| GET | `/api/agreement/pdf/:id` | Return a five-minute signed `{ pdfUrl, fileName }` for the stored PDF |

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

## AWS PDF storage

Both Save and Save & Download persist the agreement first, render the returned agreement (including its final number), then upload the PDF. The uploader reuses `uploadImageToS3`, `AWS_S3_BUCKET_MASSCLICK`, and the existing AWS credentials/region. Keys are registered in `s3ScopeRegistry.js` and generated with `s3Keys.agreement.document(id)` as `agreements/{agreementId}/document/{ulid}.pdf`. Image conversion is disabled and content type is `application/pdf`.

The agreement stores `pdfKey`, `pdfFileName`, `pdfSize`, and `pdfUploadedAt`. Editing agreement details clears the current PDF metadata until the replacement uploads. Each upload uses a new versioned key. The upload compares the submitted saved `updatedAt` before and after S3 upload to reject stale PDFs. Maximum upload size is 5 MB. Only admins can upload or request a signed URL.

The table shows Stored in AWS or Upload pending. If generation/upload fails, the saved agreement remains available and the form offers retry without creating another agreement. Download uses the stored S3 file; older records without a PDF generate and upload one from freshly loaded saved data on their first download. The S3 bucket's existing GET CORS configuration must allow the admin application's origin for browser downloads.

Storage tests: `node --test server/helper/agreement/agreementPdfHelper.test.js` (mocked AWS requests; no live uploads).
