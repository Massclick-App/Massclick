import React from "react";
import LetterheadPage from "./LetterheadPage";
import QuotationPage from "./QuotationPage";
import VoucherPage from "./VoucherPage";
import VisitingCardPage from "./VisitingCardPage";
import MarketingMaterialsOverview from "./MarketingMaterialsOverview";

const pageByType = {
  "visiting-card": VisitingCardPage,
  letterhead: LetterheadPage,
  quotation: QuotationPage,
  voucher: VoucherPage,
};

export default function MarketingMaterialsPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const type = searchParams.get("type") || "";
  const Page = pageByType[type] || MarketingMaterialsOverview;

  return <Page />;
}
