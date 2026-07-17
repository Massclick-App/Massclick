import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { pageview } from "./utils/analytics.js";
import { trackPageView } from "./utils/webTracker.js";

const RouteChangeTracker = () => {
  const location = useLocation();

  useEffect(() => {
    pageview(location.pathname + location.search);
    trackPageView(location.pathname);
  }, [location]);

  return null;
};

export default RouteChangeTracker;
