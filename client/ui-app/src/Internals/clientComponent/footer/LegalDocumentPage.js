import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import { fetchPublishedLegalDocument } from "../../../redux/actions/legalDocumentsAction.js";
import { fetchSeoMeta } from "../../../redux/actions/seoAction";
import StickySearchBar from "../StickySearchBar/StickySearchBar";
import Footer from "./footer";
import SeoMeta from "../seo/seoMeta";
import { getLegalFallbackDocument } from "./legalFallbackContent.js";
import styles from "./legalDocumentPage.module.css";

const cx = createScopedClassNames(styles);

const formatDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const AccordionItem = ({ section, index, isOpen, onToggle }) => (
  <div className={cx(`legal-accordion-item ${isOpen ? "open" : ""}`)}>
    <button
      type="button"
      className={cx("legal-accordion-header")}
      aria-expanded={isOpen}
      onClick={() => onToggle(index)}
    >
      <h3 className={cx("legal-accordion-title")}>
        <span className={cx("legal-accordion-number")}>{index + 1}.</span>
        {section.heading}
      </h3>
      <span className={cx("legal-accordion-icon")}>
        {isOpen ? <RemoveIcon /> : <AddIcon />}
      </span>
    </button>

    <div className={cx("legal-accordion-content")}>
      <div
        className={cx("legal-accordion-body")}
        // Authored in the admin rich-text editor and stored as HTML; the editor
        // is admin-only and its toolbar emits a fixed, safe tag set.
        dangerouslySetInnerHTML={{ __html: section.body }}
      />
    </div>
  </div>
);

/**
 * Renders a legal document (privacy policy, terms, refund policy) from the
 * published copy in the API, falling back to the bundled snapshot so the page
 * never renders empty for a visitor or a crawler.
 */
export default function LegalDocumentPage({
  documentType,
  seoPageType,
  fallbackSeo,
  headingLead,
  headingHighlight,
}) {
  const dispatch = useDispatch();
  const [openIndex, setOpenIndex] = useState(0);

  const { meta: seoMetaData } = useSelector((state) => state.seoReducer);
  const publishedDocument = useSelector(
    (state) => state.legalDocuments?.published?.[documentType]
  );

  useEffect(() => {
    dispatch(fetchSeoMeta({ pageType: seoPageType }));
  }, [dispatch, seoPageType]);

  useEffect(() => {
    dispatch(fetchPublishedLegalDocument(documentType));
  }, [dispatch, documentType]);

  const document = useMemo(
    () => publishedDocument || getLegalFallbackDocument(documentType),
    [publishedDocument, documentType]
  );

  const sections = document?.sections || [];
  const effectiveDate = formatDate(document?.effectiveDate);

  const handleToggle = (index) =>
    setOpenIndex((current) => (current === index ? null : index));

  return (
    <>
      <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
      <StickySearchBar />

      <section className={cx("legal-section")}>
        <div className={cx("legal-header-wrapper")}>
          <h1 className={cx("legal-title")}>
            {headingLead}{" "}
            <span className={cx("legal-title-highlight")}>{headingHighlight}</span>
          </h1>

          {document?.summary && (
            <p className={cx("legal-subtitle")}>{document.summary}</p>
          )}

          {effectiveDate && (
            <p className={cx("legal-meta")}>
              Effective {effectiveDate}
              {document?.version ? ` · Version ${document.version}` : ""}
            </p>
          )}
        </div>

        {sections.length > 0 && (
          <div className={cx("legal-accordion-container")}>
            {sections.map((section, index) => (
              <AccordionItem
                key={section.key || index}
                section={section}
                index={index}
                isOpen={openIndex === index}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}

        {document?.contactEmail && (
          <p className={cx("legal-contact")}>
            Questions about this document? Write to{" "}
            <a
              className={cx("legal-link")}
              href={`mailto:${document.contactEmail}`}
            >
              {document.contactEmail}
            </a>
            .
          </p>
        )}
      </section>

      <Footer />
    </>
  );
}
