import React, { lazy, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
  buildDistrictCategoryContext,
  buildLegacyRouteContext,
  buildLocationCategoryContext,
  formatUrlText,
  resolveDistrictRoute,
} from "../../../utils/districtRouteResolution.js";
import CategoryRouter from "./categoryRouter.js";

const SearchResults = lazy(() =>
  import(/* webpackChunkName: "search" */ "../SearchResult/SearchResult.js")
);

const DistrictRouteResolver = () => {
  const { district, p2, p3 } = useParams();
  const [resolution, setResolution] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResolution(null);

    resolveDistrictRoute({ district, p2, p3 })
      .then((data) => {
        if (cancelled) return;

        const classification = data?.classification || { type: "unknown" };
        const districtSummary = data?.district || {
          slug: district,
          name: formatUrlText(district),
        };

        if (classification.type === "location") {
          setResolution({
            mode: "category",
            routeContext: buildLocationCategoryContext({
              district: districtSummary,
              location: classification.location,
              category: classification.categorySlug || p3,
            }),
          });
          return;
        }

        if (classification.type === "districtCategory") {
          setResolution({
            mode: classification.subcategorySlug ? "search" : "category",
            routeContext: buildDistrictCategoryContext({
              district: districtSummary,
              category: classification.categorySlug || p2,
              subcategory: classification.subcategorySlug || "",
            }),
          });
          return;
        }

        setResolution({
          mode: "search",
          routeContext: buildDistrictCategoryContext({
            district: districtSummary,
            category: p2,
            subcategory: p3,
          }),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setResolution({
          mode: "search",
          routeContext: buildLegacyRouteContext({
            location: district,
            category: p2,
            subcategory: p3,
          }),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [district, p2, p3]);

  if (!resolution) return null;

  if (resolution.mode === "category") {
    return <CategoryRouter routeContext={resolution.routeContext} />;
  }

  return <SearchResults routeContext={resolution.routeContext} />;
};

export default DistrictRouteResolver;
