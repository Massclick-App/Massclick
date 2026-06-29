import React from "react";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import BusinessDocumentsNav from "./BusinessDocumentsNav";
import styles from "./VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);

export default function QuotationPage() {
  return (
    <>
      <StickySearchBar />
      <main className={cx("visiting-card-page")}>
        <section className={cx("page-header")}>
          <BusinessDocumentsNav />
          <span>Business Document</span>
          <h1>Quotation Page</h1>
          <p>Create and manage business quotation templates from this page.</p>
        </section>

        <section className={cx("document-placeholder")}>
          <h2>Quotation templates</h2>
          <p>Quotation design tools will be added here as a separate page.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
