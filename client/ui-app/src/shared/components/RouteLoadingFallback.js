import React from "react";
import { useLocation } from "react-router-dom";
import ShimmerSkeleton from "features/public/shimmerSkeleton.js";
import HomeRouteFallback from "shared/components/HomeRouteFallback.js";

const RouteLoadingFallback = () => {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return <HomeRouteFallback />;
  }

  return <ShimmerSkeleton />;
};

export default React.memo(RouteLoadingFallback);
