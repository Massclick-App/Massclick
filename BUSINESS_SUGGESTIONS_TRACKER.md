# Business Suggestions + Office Number Cleanup — Tracker

Started 2026-09-18. Customers (logged in) suggest corrections on the business detail
page; admins approve/reject; approval writes to the listing.

## Phase 1 — Clear office number 9894804201
- [x] `server/scripts/clearOfficeNumber.js` (dry run default, self-snapshot, rollback report)
      NOTE: `/server/scripts` is gitignored — this script is local-only unless force-added.
- [x] Dev dry run: 247 listings (contact 247 / contactList 235 / whatsapp 182)
- [x] Dev apply: 247 updated, 0 remaining. Snapshot `db-backups/snapshots/massClick_dev/2026-09-18_10-25-25__pre-clear-office-number`
- [x] Prod apply 2026-09-18: 343 updated (contact 343 / contactList 330 / whatsapp 246), 0 remaining. Snapshot `db-backups/snapshots/massClick/2026-09-18_11-37-56__pre-clear-office-number`

## Phase 2 — Detail page with no number (`features/public/cards/cardDetails.js`)
- [x] Show Number / Call Now / sidebar contact / info-card Phone -> "Suggest number" when `contact` empty
- [x] JSON-LD `telephone` — already omitted when empty (seoSchemaGenerators.js), no change needed
- [x] FAQ contact answer no longer mentions missing buttons

## Phase 3 — Customer suggestions
- [x] `business_suggestions` schema/model/collection name
- [x] `POST /api/business/:id/suggestions` — customer-only auth, 5/day/user, pending dedupe, phone/email/website validation
- [x] "Edit this Listing" (non-owner) -> field-picker "Suggest an edit" form; timing form now posts here too
- [x] "Claim this business" unchanged (still user_feedbacks)

## Phase 4 — Admin review
- [x] Admin API: list (+ live value, pendingCount), pending-count, approve (edit value, WhatsApp opt-in, 409 stale guard, force), reject
- [x] `/dashboard/business-suggestions` page + lazy route + pageRegistry (grant via Roles) + menu entry with pending badge
- [x] "Claims & feedback" tab on the same page (existing, previously unused `/api/admin/user-feedback`)
- [x] Business edit form: pending-suggestions banner; approvals patch the open form so Save doesn't revert them
- [x] Admin business list: "No Phone" filter (`contactStatus=missing`, list + export)

## Verification
- [x] Backend flow vs dev DB via `server/scripts/_scratch/testBusinessSuggestions.mjs`: validation, create, dedupe, list, stale 409, force approve w/ edited value + WhatsApp, double-approve refused, reject. Test listing restored, test rows deleted.
- [x] ESLint on new files clean
- [ ] UI not run in a browser yet (needs `npm start` — ask user)

## Prod replay list
- ~~Run clearOfficeNumber.js on prod~~ DONE 2026-09-18 (343)
- `business_suggestions` indexes are created by Mongoose autoIndex on first boot — verify after deploy
- Grant "Listing Suggestions" page to non-superadmin roles in Roles if they should review
