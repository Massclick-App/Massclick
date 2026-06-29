import React from "react";
import { useSearchParams } from "react-router-dom";
import LetterheadPage from "./LetterheadPage";
import QuotationPage from "./QuotationPage";
import VisitingCardPage from "./VisitingCardPage";

const pageByType = {
  letterhead: LetterheadPage,
  quotation: QuotationPage,
};

export default function MarketingMaterialsPage() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "";
  const Page = pageByType[type] || VisitingCardPage;

  return <Page />;
}
