import React, { lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
const CategoriesPage = lazy(() =>
  import(/* webpackChunkName: "category-directory" */ "./categories.js")
);

const DistrictRouteResolver = () => {
  const { district, p2, p3, p4 } = useParams();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResolution(null);

    resolveDistrictRoute({ district, p2, p3, p4 })
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
              category: classification.categorySlug || p4 || p3,
            }),
          });
          return;
        }

        if (classification.type === "locationLanding") {
          setResolution({
            mode: "locationLanding",
            routeContext: buildLocationCategoryContext({
              district: districtSummary,
              location: classification.location,
              routeType: "locationLanding",
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
          // (e.g. the district's own name, "/salem/salem/hotels"). Redirect
          // to the canonical district-wide category URL rather than
          // rendering it in place at the 3-segment URL: leaving the browser
          // there keeps the address bar showing a URL shaped like a
          // locality-specific page when it isn't one, and there's already a
          // fully-working /:district/:category route to hand off to.
          // replace:true so this doesn't add a back-button entry for a URL
          // the user never intentionally chose.
          navigate(`/${districtSummary.slug}/${classification.categorySlug}`, {
            replace: true,
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
            subcategory: p4 || p3,
          }),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [district, p2, p3, p4, navigate]);

  if (!resolution) return null;

  if (resolution.mode === "category") {
    return <CategoryRouter routeContext={resolution.routeContext} />;
  }

  if (resolution.mode === "locationLanding") {
    return <CategoriesPage routeContext={resolution.routeContext} mode="locationLanding" />;
  }

  return <SearchResults routeContext={resolution.routeContext} />;
};

export default DistrictRouteResolver;
