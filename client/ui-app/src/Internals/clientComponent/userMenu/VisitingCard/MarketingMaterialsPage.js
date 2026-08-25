import React from "react";
import { useLocation } from "react-router-dom";
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
  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const type = searchParams.get("type") || "";
  const Page = pageByType[type] || MarketingMaterialsOverview;

  return <Page />;
}
