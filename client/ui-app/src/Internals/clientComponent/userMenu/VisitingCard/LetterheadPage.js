import React from "react";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import StickySearchBar from "../../StickySearchBar/StickySearchBar";
import Footer from "../../footer/footer";
import BusinessDocumentsNav from "./BusinessDocumentsNav";
import styles from "./VisitingCardPage.module.css";

const cx = createScopedClassNames(styles);

export default function LetterheadPage() {
  return (
    <>
      <StickySearchBar />
      <main className={cx("visiting-card-page")}>
        <section className={cx("page-header")}>
          <BusinessDocumentsNav />
          <span>Business Stationery</span>
          <h1>Letterhead Page</h1>
          <p>Create and manage your business letterhead templates from this page.</p>
        </section>

        <section className={cx("document-placeholder")}>
          <h2>Letterhead templates</h2>
          <p>Letterhead design tools will be added here as a separate page.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
