import React from "react";
import logo from "assets/MassClick_pvt_ltd.webp";
import {
  dateLabel,
  money,
  totals,
  agreementPrefix,
} from "features/admin/agreement/agreementUtils.js";
import styles from "features/admin/agreement/agreementDocument.module.css";

export default function AgreementDocument({ agreement }) {
  const a = agreement;
  const values = totals(a);
  return (
    <article className={styles.document}>
      <header className={styles.header}>
        <img src={logo} alt="MassClick Technologies Pvt Ltd" />
        <h1>BUSINESS AGREEMENT</h1>
        <h2>
          For MassClick Local Search Engine Listing &amp; Digital Marketing
          Services
        </h2>
      </header>
      <div className={styles.metadata}>
        <span>
          <b>Agreement No. :</b>{" "}
          {a.agreementNo || `${agreementPrefix(a.issueDate)}______`}
        </span>
        <span>
          <b>Date :</b> {dateLabel(a.issueDate)}
        </span>
        <span>
          <b>Place :</b> {a.place}
        </span>
      </div>
      <p className={styles.intro}>
        This Agreement is made between <b>MassClick Technologies Pvt Ltd</b> and
        the undersigned business owner / authorized representative (“Client”)
        for the use of MassClick Local Search Engine listing, mobile application
        and related services as mentioned below.
      </p>
      <section className={styles.section}>
        <h3>
          <span>1.</span> MASSCLICK PLATFORM:
        </h3>
        <div className={styles.body}>
          <p>
            A complete platform to list your business and help customers find
            you easily through the MassClick website and mobile application.
          </p>
          <div className={styles.columns}>
            <ul>
              <li>Website Listing</li>
              <li>Mobile Application</li>
            </ul>
            <ul>
              <li>More Visibility</li>
              <li>More Customers</li>
            </ul>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <h3>
          <span>2.</span> KEY FEATURES:
        </h3>
        <div className={styles.body}>
          <div className={styles.columns}>
            <ul>
              <li>Business Listing &amp; Visibility</li>
              <li>Google Search Leads Generation</li>
              <li>Website Search Leads Generation</li>
              <li>MNI Leads Generation</li>
            </ul>
            <ul>
              <li>Spotlight Promotion</li>
              <li className={styles.marketing}>
                Marketing Materials{" "}
                <small>(Visiting Card, Voucher, Quotations, Letter Head)</small>
              </li>
              <li>Mobile App Access (all above features included)</li>
            </ul>
          </div>
          <p className={styles.validity}>
            <b>Product &amp; Features Validity:</b>{" "}
            <strong className={styles.validityPeriod}>1 YEAR</strong> only from
            the activation (start) date. The plan must be recharged after 1 year
            to continue the services.
          </p>
        </div>
      </section>
      <section className={styles.section}>
        <h3>
          <span>3.</span> PRODUCT AMOUNT:
        </h3>
        <div className={styles.body}>
          <p>
            This amount includes all website features and mobile application
            features mentioned above.
          </p>
          <table className={styles.amount}>
            <thead>
              <tr>
                <th scope="col">
                  <span>Amount</span>
                </th>
                <th scope="col">
                  <span>GST ({a.taxRate}%)</span>
                </th>
                <th scope="col">
                  <span>Total Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span>{money(values.amount)}</span>
                </td>
                <td>
                  <span>{money(values.tax)}</span>
                </td>
                <td>
                  <span>{money(values.total)}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className={styles.note}>
            <b>Note:</b>
            <div>
              This amount is ONLY for the product (MassClick listing portal,
              mobile application and listed product features).
              <br />
              This does not include the above free offers or any additional
              custom services, ad spend or third-party charges.
              <br />
              This amount is non-refundable under any circumstances.
            </div>
          </div>
        </div>
      </section>
      <section className={styles.section}>
        <h3>
          <span>4.</span> FREE OFFER &amp; VALIDITY OVERVIEW:
        </h3>
        <div className={styles.body}>
          <ul>
            <li>
              The above services are provided completely FREE with this product
              for a limited period.
            </li>
            <li>
              These services can be withdrawn at any time without prior notice.
            </li>
            <li>
              The above free offers are:
              <ul>
                <li>
                  <b>Option 1 :</b> 2 Months Digital Marketing + 2 YouTube
                  Videos
                </li>
                <li>
                  <b>Option 2 :</b> 1 Month Digital Marketing + 1 Website + 2
                  YouTube Videos
                </li>
              </ul>
            </li>
            <li className={styles.productOnly}>
              This agreement amount is only for the product (MassClick listing
              portal, mobile application and listed product features).
            </li>
            <li>
              This does not include any additional custom services, ad spend or
              third-party charges.
            </li>
            <li>
              <b>Product / Features / Service Validity :</b>{" "}
              <strong className={styles.validityPeriod}>1 YEAR</strong> only
              from the activation (start) date. The plan must be recharged after
              1 year to continue the services.
            </li>
          </ul>
        </div>
      </section>
      <section className={styles.section}>
        <h3>
          <span>5.</span> ACCEPTANCE:
        </h3>
        <div className={styles.body}>
          <ul>
            <li>
              I / We hereby confirm 100% approval of this product and the above
              offer.
            </li>
            <li>The above amount is non-refundable under any circumstances.</li>
            <li>
              By signing below, I / We agree to the terms of this Agreement and
              avail the services.
            </li>
          </ul>
        </div>
      </section>
      <footer className={styles.signatures}>
        <div className={styles.signatureBox}>
          <h4>For MassClick Technologies Pvt Ltd</h4>
          <dl>
            <dt>Name</dt>
            <dd>
              <b>{a.companyName}</b>
            </dd>
            <dt>Designation</dt>
            <dd>
              <b>{a.companyDesignation}</b>
            </dd>
            <dt>Date</dt>
            <dd>{dateLabel(a.companyDate)}</dd>
            <dt>Place</dt>
            <dd>{a.companyPlace}</dd>
          </dl>
          <div className={styles.signatureLine}>Authorized Signature</div>
        </div>
        <div className={styles.signatureBox}>
          <h4>Client / Business Owner</h4>
          <dl>
            <dt>Business Name</dt>
            <dd>{a.businessName || "____________________________"}</dd>
            {a.clientName && (
              <>
                <dt>Owner Name</dt>
                <dd>{a.clientName}</dd>
              </>
            )}
            <dt>Address</dt>
            <dd className={styles.address}>
              {a.clientAddress ||
                "____________________________\n____________________________"}
            </dd>
            <dt>Date</dt>
            <dd>{dateLabel(a.clientDate)}</dd>
            <dt>Place</dt>
            <dd>{a.clientPlace || "____________________________"}</dd>
          </dl>
          <div className={styles.signatureLine}>Authorized Signature</div>
        </div>
      </footer>
    </article>
  );
}
