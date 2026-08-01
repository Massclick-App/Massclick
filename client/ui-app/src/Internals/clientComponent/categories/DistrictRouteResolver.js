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

        if (classification.type === "unresolvedLocation") {
          // p2 didn't resolve as a location or category, but p3 IS a real
          // category — p2 was almost certainly a failed/mistyped location
          // (e.g. the district's own name). Render the district-wide
          // category from p3 instead of fabricating a category out of p2 —
          // matches how a genuine /:district/:category districtCategory
          // renders (see server/helper/location/urlSegmentClassifier.js).
          setResolution({
            mode: "category",
            routeContext: buildDistrictCategoryContext({
              district: districtSummary,
              category: classification.categorySlug,
              subcategory: "",
            }),
          });
          return;
        }

        // Genuine "unknown": neither p2 nor p3 resolved to anything real.
        // Treat p2 as a free-text search term rather than a fabricated
        // category, so the existing no-results UI can name what was
        // actually typed. isKnownCategory must be forced false — p2 was
        // never verified to be a real category.
        setResolution({
          mode: "search",
          routeContext: buildDistrictCategoryContext({
            district: districtSummary,
            category: p2,
            subcategory: "",
            isKnownCategory: false,
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
