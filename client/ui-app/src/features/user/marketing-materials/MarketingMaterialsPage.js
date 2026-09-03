import React from "react";
import { useLocation } from "react-router-dom";
import LetterheadPage from "features/user/marketing-materials/LetterheadPage.js";
import QuotationPage from "features/user/marketing-materials/QuotationPage.js";
import VoucherPage from "features/user/marketing-materials/VoucherPage.js";
import VisitingCardPage from "features/user/marketing-materials/VisitingCardPage.js";
import MarketingMaterialsOverview from "features/user/marketing-materials/MarketingMaterialsOverview.js";

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
