/**
 * Snapshot the published legal documents into a bundled fallback for the web
 * client.
 *
 * The /privacy and /terms pages fetch their live wording from the API. This
 * file is what they render if that fetch fails — a legal page that shows an
 * error box instead of the policy is worse than one showing slightly stale
 * text, and crawlers must never see an empty page.
 *
 * Re-run after publishing a change:
 *   node server/seeders/exportLegalFallback.cjs
 */

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DEFAULT_URI =
  "mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin";

const uriFlagIndex = process.argv.indexOf("--uri");
const MONGO_URI =
  (uriFlagIndex !== -1 && process.argv[uriFlagIndex + 1]) ||
  process.env.MONGO_URI ||
  DEFAULT_URI;

const OUTPUT_PATH = path.resolve(
  __dirname,
  "../../client/ui-app/src/Internals/clientComponent/footer/legalFallbackContent.js"
);

const run = async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const documents = await mongoose.connection.db
    .collection("legal_documents")
    .find({ status: "published", locale: "en" })
    .sort({ type: 1 })
    .toArray();

  if (!documents.length) {
    throw new Error(
      "No published legal documents found — run seeders/legalDocumentsSeeder.cjs first."
    );
  }

  const payload = documents.reduce((accumulator, document) => {
    accumulator[document.type] = {
      type: document.type,
      version: document.version,
      title: document.title,
      summary: document.summary,
      effectiveDate: document.effectiveDate.toISOString(),
      contactEmail: document.contactEmail,
      sections: document.sections.map((section) => ({
        key: section.key,
        heading: section.heading,
        body: section.body,
      })),
    };
    return accumulator;
  }, {});

  const banner = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Snapshot of the published legal documents, used by /privacy and /terms when
 * the live fetch from /api/legal-documents/published fails. Edit the wording in
 * admin (Dashboard → Legal Documents), publish it, then regenerate:
 *
 *   node server/seeders/exportLegalFallback.cjs
 *
 * Snapshot taken: ${new Date().toISOString()}
 */

`;

  const body = `export const LEGAL_FALLBACK_DOCUMENTS = ${JSON.stringify(
    payload,
    null,
    2
  )};

export const getLegalFallbackDocument = (type) =>
  LEGAL_FALLBACK_DOCUMENTS[type] || null;
`;

  fs.writeFileSync(OUTPUT_PATH, banner + body, "utf8");

  console.log(`Wrote ${OUTPUT_PATH}`);
  documents.forEach((document) => {
    console.log(
      `  ${document.type} v${document.version} — ${document.sections.length} sections`
    );
  });

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Export failed:", error.message);
    process.exit(1);
  });
