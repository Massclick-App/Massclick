import React from "react";
import { useLocation } from "react-router-dom";
import ShimmerSkeleton from "../Internals/clientComponent/shimmerSkeleton.js";
import HomeRouteFallback from "./HomeRouteFallback.js";

const RouteLoadingFallback = () => {
  const { pathname } = useLocation();

  if (pathname === "/") {
    return <HomeRouteFallback />;
  }

  return <ShimmerSkeleton />;
};

export default React.memo(RouteLoadingFallback);
