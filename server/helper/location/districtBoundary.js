import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Point-in-polygon tests against real Tamil Nadu district boundaries.
//
// This exists because the obvious alternative does not work. Deriving a
// district's bounds from its own businesses' coordinates is self-poisoning:
// the wrong coordinates are what widen the bounds, so the bounds end up
// vouching for them. Measured on Trichy, the business-derived p5–p95 box was
// minLng 77.684 (dragged there by the four bad points that sit at 77.70) and
// a latitude span of only 0.12° — it cleared all four bad points and flagged
// Thuraiyur and Thathaiyangarpettai, which are real places in the north of
// the district. A published boundary has no such feedback loop.
//
// Source: tamil_nadu_districts.geojson, LGD/Government of India district
// boundaries (Government Open Data License - India). Properties are `n`
// (district name) and `c` (LGD code).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEOJSON_PATH = path.resolve(__dirname, "..", "..", "assets", "geo", "tamil_nadu_districts.geojson");

// District names as they appear in `masterlocations.district` mapped to the
// spelling used in the boundary file, where the two differ.
const DISTRICT_NAME_ALIASES = new Map([
  ["thoothukudi", "tuticorin"],
  ["kanyakumari", "kanniyakumari"],
  ["mayiladuturai", "mayiladuthurai"],
  ["nilgiris", "the nilgiris"],
  ["viluppuram", "villupuram"],
  ["tiruvarur", "thiruvarur"],
  ["tiruvallur", "thiruvallur"],
]);

const normalizeName = (value) => String(value || "")
  .toLowerCase()
  .replace(/\bdistrict\b/g, " ")
  .replace(/[^a-z]+/g, " ")
  .trim();

let boundaryIndex = null;

const loadBoundaries = () => {
  if (boundaryIndex) return boundaryIndex;

  boundaryIndex = new Map();
  if (!fs.existsSync(GEOJSON_PATH)) return boundaryIndex;

  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  for (const feature of geojson.features || []) {
    const key = normalizeName(feature?.properties?.n);
    if (key && feature.geometry) boundaryIndex.set(key, feature.geometry);
  }
  return boundaryIndex;
};

// Ray casting. `ring` is a closed GeoJSON linear ring of [lng, lat] pairs.
const insideRing = ([x, y], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
};

// Outer ring minus any holes.
const insidePolygon = (point, rings) =>
  insideRing(point, rings[0]) && !rings.slice(1).some((hole) => insideRing(point, hole));

const insideGeometry = (point, geometry) => {
  if (!geometry) return false;
  if (geometry.type === "Polygon") return insidePolygon(point, geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((rings) => insidePolygon(point, rings));
  }
  return false;
};

const allRings = (geometry) => (geometry.type === "Polygon"
  ? geometry.coordinates
  : geometry.coordinates.flat());

// Distance in km from a point to a segment, on a local equirectangular
// projection. Accurate enough at the few-km scale this is used for.
const kmToSegment = ([px, py], [ax, ay], [bx, by]) => {
  const kx = 111.32 * Math.cos((py * Math.PI) / 180);
  const ky = 110.57;
  const vx = (px - ax) * kx;
  const vy = (py - ay) * ky;
  const wx = (bx - ax) * kx;
  const wy = (by - ay) * ky;
  const lengthSq = wx * wx + wy * wy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, (vx * wx + vy * wy) / lengthSq));
  return Math.hypot(vx - t * wx, vy - t * wy);
};

const kmToBoundary = (point, geometry) => {
  let best = Infinity;
  for (const ring of allRings(geometry)) {
    for (let i = 0; i < ring.length - 1; i++) {
      best = Math.min(best, kmToSegment(point, ring[i], ring[i + 1]));
      if (best === 0) return 0;
    }
  }
  return best;
};

// How far outside a district boundary a point may sit and still be accepted.
//
// District polygons are simplified, and a village that genuinely straddles a
// border will land on the wrong side of the line. Measured against real Trichy
// data: Nazareth Rd resolved 0.37km outside the border while Kunnathur — the
// same neighbourhood, 0.67km away — resolved 0.28km inside. Judging those two
// differently would be noise, not signal. Kathalur, by contrast, resolved
// 3.76km outside, and its hierarchy really is wrong. 2km separates the two
// cases cleanly.
const DEFAULT_TOLERANCE_KM = 2;

export const hasDistrictBoundary = (district) => {
  const key = normalizeName(district);
  const boundaries = loadBoundaries();
  return boundaries.has(DISTRICT_NAME_ALIASES.get(key) || key);
};

// True when [lng, lat] falls inside the named district, or within
// `toleranceKm` of its border.
//
// Returns `true` for a district we have no boundary for — callers use this to
// reject bad coordinates, and an unknown district must not become a reason to
// reject every point in it. Check hasDistrictBoundary() first when you need to
// tell "inside" apart from "unverifiable".
export const isPointInDistrict = (district, coordinates, { toleranceKm = DEFAULT_TOLERANCE_KM } = {}) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return false;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false;

  const key = normalizeName(district);
  const boundaries = loadBoundaries();
  const geometry = boundaries.get(DISTRICT_NAME_ALIASES.get(key) || key);
  if (!geometry) return true;

  if (insideGeometry([lng, lat], geometry)) return true;
  return toleranceKm > 0 && kmToBoundary([lng, lat], geometry) <= toleranceKm;
};

// Km outside the district boundary, or 0 when inside. Null when there is no
// boundary to measure against. For reports that need to rank how wrong a
// coordinate is rather than just accept or reject it.
export const kmOutsideDistrict = (district, coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const [lng, lat] = coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const key = normalizeName(district);
  const geometry = loadBoundaries().get(DISTRICT_NAME_ALIASES.get(key) || key);
  if (!geometry) return null;
  if (insideGeometry([lng, lat], geometry)) return 0;
  return kmToBoundary([lng, lat], geometry);
};
