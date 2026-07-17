import React from "react";

/**
 * Critical homepage shell used while the lazily loaded home route is resolving.
 *
 * Its class names are intentionally shared with the server-rendered shell in
 * server/utils/homeRouteShell.mjs. The matching critical CSS lives in
 * public/index.html so the first server paint, this React fallback, and the
 * final homepage all reserve the same header + hero geometry.
 */
const HomeRouteFallback = () => (
  <div className="home-route-shell" data-home-route-shell="">
    <header className="home-route-shell__header">
      <div className="home-route-shell__brand" aria-label="Massclick">
        <span className="home-route-shell__brand-mark" aria-hidden="true">
          M
        </span>
        <span className="home-route-shell__brand-name">massclick</span>
      </div>
      <div className="home-route-shell__header-actions" aria-hidden="true">
        <span className="home-route-shell__header-action" />
        <span className="home-route-shell__header-action" />
      </div>
    </header>

    <main className="home-route-shell__hero">
      <div className="home-route-shell__hero-layout">
        <div className="home-route-shell__heading">
          <h1 className="home-route-shell__title">
            Explore. Connect.
            <br />
            <span className="home-route-shell__title-accent">
              Succeed Local.
            </span>
          </h1>
          <p className="home-route-shell__subtitle">
            Find trusted businesses and services near you.
          </p>
        </div>

        <div className="home-route-shell__panel" aria-hidden="true">
          <div className="home-route-shell__search" aria-hidden="true">
            <span className="home-route-shell__field" />
            <span className="home-route-shell__field" />
            <span className="home-route-shell__search-button" />
          </div>
          <div className="home-route-shell__trust" aria-hidden="true">
            <span className="home-route-shell__trust-item" />
            <span className="home-route-shell__trust-item" />
            <span className="home-route-shell__trust-item" />
            <span className="home-route-shell__trust-item" />
          </div>
        </div>
      </div>
    </main>
  </div>
);

export default React.memo(HomeRouteFallback);
