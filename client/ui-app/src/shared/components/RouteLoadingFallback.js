import React from "react";
import { useLocation } from "react-router-dom";
import ShimmerSkeleton from "features/public/shimmerSkeleton.js";
import HomeRouteFallback from "shared/components/HomeRouteFallback.js";
import BusinessRouteFallback, { getSsrBusinessShell } from "shared/components/BusinessRouteFallback.js";

const RouteLoadingFallback = () => {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return <HomeRouteFallback />;
  }

  const ssrBusinessShell = getSsrBusinessShell(pathname);
  if (ssrBusinessShell) {
    return <BusinessRouteFallback shell={ssrBusinessShell} />;
  }

  return <ShimmerSkeleton />;
};

export default React.memo(RouteLoadingFallback);
