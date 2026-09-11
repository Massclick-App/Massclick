import React from "react";

// React twin of server/utils/businessRouteShell.mjs; critical CSS lives in public/index.html.
export const getSsrBusinessShell = (pathname = "") => {
  const shell = typeof window !== "undefined" ? window.__SSR_BUSINESS__ : null;
  return shell && shell.path === pathname ? shell : null;
};

const BusinessRouteFallback = ({ shell }) => (
  <div
    className={`biz-route-shell${shell.layout === "single" ? " biz-route-shell--single" : ""}`}
    data-business-route-shell=""
    aria-hidden="true"
  >
    <div className="biz-route-shell__bar" />
    <div className="biz-route-shell__page">
      <div className="biz-route-shell__crumbs" />
      <div className="biz-route-shell__media">
        {shell.imageUrl && shell.layout === "single" ? (
          <img className="biz-route-shell__backdrop" src={shell.imageUrl} alt="" />
        ) : null}
        {shell.imageUrl ? (
          <img
            className="biz-route-shell__image"
            src={shell.imageUrl}
            alt=""
            width="1200"
            height="600"
            fetchpriority="high"
          />
        ) : null}
      </div>
      <p className="biz-route-shell__name">{shell.name}</p>
      {shell.meta ? <p className="biz-route-shell__meta">{shell.meta}</p> : null}
    </div>
  </div>
);

export default BusinessRouteFallback;
