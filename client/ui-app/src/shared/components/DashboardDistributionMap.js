import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Maximize2, Minus, Plus, X } from "lucide-react";
import s from "./DashboardOverview.module.css";

const TILE_URL =
  process.env.REACT_APP_DASHBOARD_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const project = (lat, lng, zoom) => {
  const sin = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
};
const unproject = (x, y, zoom) => {
  const scale = 256 * 2 ** zoom;
  return {
    lng: (((((x / scale) * 360) % 360) + 360) % 360) - 180,
    lat: Math.max(
      -85,
      Math.min(
        85,
        (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI,
      ),
    ),
  };
};
export default function DashboardDistributionMap({
  clusters = [],
  onLocationClick,
}) {
  const container = useRef(null);
  const drag = useRef(null);
  const [size, setSize] = useState({ width: 300, height: 220 });
  const [center, setCenter] = useState({ lat: 10.7905, lng: 78.7047 });
  const [zoom, setZoom] = useState(10);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState("");
  const [tileError, setTileError] = useState(false);
  const valid = useMemo(
    () =>
      clusters.filter(
        (item) => Number.isFinite(item.lat) && Number.isFinite(item.lng),
      ),
    [clusters],
  );
  const locations = useMemo(() => [...new Set(valid.map(item => item.name))], [valid]);
  const visible = useMemo(() => selected ? valid.filter(item => item.name === selected) : valid, [valid, selected]);
  const fit = useCallback(() => {
    if (!visible.length) return;
    const points = visible.map(item => project(item.lat, item.lng, 0));
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const scale = Math.min(Math.max(1, size.width - 88) / Math.max(maxX - minX, 0.001), Math.max(1, size.height - 100) / Math.max(maxY - minY, 0.001));
    setZoom(Math.max(3, Math.min(14, Math.floor(Math.log2(scale)))));
    setCenter(unproject((minX + maxX) / 2, (minY + maxY) / 2, 0));
  }, [visible, size]);
  useEffect(() => { fit(); }, [fit]);
  useEffect(() => {
    if (selected && !locations.includes(selected)) setSelected("");
  }, [locations, selected]);
  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const close = (event) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);
  const point = project(center.lat, center.lng, zoom);
  const left = point.x - size.width / 2,
    top = point.y - size.height / 2;
  const tiles = [];
  for (
    let x = Math.floor(left / 256);
    x <= Math.floor((left + size.width) / 256);
    x += 1
  ) {
    for (
      let y = Math.floor(top / 256);
      y <= Math.floor((top + size.height) / 256);
      y += 1
    ) {
      if (y < 0 || y >= 2 ** zoom) continue;
      const wrapped = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      tiles.push(
        <img
          key={`${zoom}-${x}-${y}`}
          src={TILE_URL.replace("{z}", zoom)
            .replace("{x}", wrapped)
            .replace("{y}", y)}
          alt=""
          draggable={false}
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setTileError(true)}
          style={{ left: x * 256 - left, top: y * 256 - top }}
        />,
      );
    }
  }
  return (
    <div className={expanded ? s.mapExpanded : s.mapWrap}>
      <div
        ref={container}
        className={s.map}
        aria-label="Business distribution map"
        onPointerDown={(event) => {
          if (event.target.closest("button,select,a")) return;
          drag.current = { x: event.clientX, y: event.clientY, point };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (drag.current)
            setCenter(
              unproject(
                drag.current.point.x - event.clientX + drag.current.x,
                drag.current.point.y - event.clientY + drag.current.y,
                zoom,
              ),
            );
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className={s.mapTiles}>{tiles}</div>
        <div className={s.mapZoom}>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 17}
            onClick={() => setZoom((z) => z + 1)}
          >
            <Plus size={19} />
          </button>
          <button
            aria-label="Zoom out"
            disabled={zoom <= 3}
            onClick={() => setZoom((z) => z - 1)}
          >
            <Minus size={19} />
          </button>
          <button
            aria-label="Recenter map"
            onClick={fit}
          >
            <Crosshair size={16} />
          </button>
        </div>
        <select
          className={s.mapSelect}
          aria-label="Map location"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
          }}
        >
          <option value="">All locations</option>
          {locations.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button
          className={s.mapExpand}
          aria-label={expanded ? "Close expanded map" : "Expand map"}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <X size={17} /> : <Maximize2 size={17} />}
        </button>
        {visible.map((item) => {
          const p = project(item.lat, item.lng, zoom);
          const x = p.x - left,
            y = p.y - top;
          if (x < -25 || x > size.width + 25 || y < -25 || y > size.height + 25)
            return null;
          const ratio =
            item.count / Math.max(...valid.map((row) => row.count), 1);
          return (
            <button
              key={`${item.name}-${item.lat}-${item.lng}`}
              className={s.mapBubble}
              style={{
                left: x,
                top: y,
                "--bubble":
                  ratio > 0.7
                    ? "#ff253c"
                    : ratio > 0.25
                      ? "#ff7b18"
                      : "#ffac11",
              }}
              title={`${item.name}: ${item.count} businesses in this area. View businesses in ${item.name}.`}
              aria-label={`${item.name}: ${item.count} businesses`}
              onClick={() => onLocationClick?.(item.name)}
            >
              {item.count >= 1000
                ? `${(item.count / 1000).toFixed(1)}K`
                : item.count}
            </button>
          );
        })}
        {!valid.length && (
          <span className={s.mapEmpty}>
            No geocoded businesses in this selection
          </span>
        )}
        {tileError && (
          <span className={s.mapEmpty}>
            Map tiles unavailable. Location filters remain available above.
          </span>
        )}
        <a
          className={s.attribution}
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
      </div>
      <div className={s.mapLegend}>
        <span>
          <i style={{ background: "#ff253c" }} />
          High density
        </span>
        <span>
          <i style={{ background: "#ff7b18" }} />
          Medium
        </span>
        <span>
          <i style={{ background: "#ffac11" }} />
          Low
        </span>
      </div>
    </div>
  );
}
