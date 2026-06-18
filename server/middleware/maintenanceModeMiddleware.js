import systemSettingsModel from "../model/systemSettings/systemSettingsModel.js";
import { createLogger } from "../utils/logger.js";
import { extractBearerToken, resolveAuthActorFromToken } from "../auth/authResolver.js";

const logger = createLogger("MAINTENANCE_MODE");

// Endpoints that should NOT be blocked by maintenance mode
const MAINTENANCE_WHITELIST = [
  /^\/api\/app-version/i,
  /^\/api\/admin\/system-settings/i,
  /^\/api\/oauth\//i,
  /^\/socket\.io\//i,
  /^\/\.well-known\//i,
  /^\/sitemap/i,
];

let cachedSettings = null;
let lastSettingsCheck = 0;
const SETTINGS_CACHE_TTL = 5000; // Cache for 5 seconds

const isWhitelisted = (path) => {
  return MAINTENANCE_WHITELIST.some(pattern => pattern.test(path));
};

const isApiRequest = (req) => req.path?.startsWith("/api/");

const isDocumentNavigation = (req) => {
  const method = (req.method || "GET").toUpperCase();
  const accept = String(req.headers?.accept || "");
  return (method === "GET" || method === "HEAD") && accept.includes("text/html");
};

const getAdminActorFromRequest = async (req) => {
  const token = extractBearerToken(req.headers?.authorization || req.headers?.Authorization || "");
  if (!token) return null;

  try {
    const actor = await resolveAuthActorFromToken(token, { source: "maintenance-bypass" });
    return actor?.actorType === "admin" ? actor : null;
  } catch {
    return null;
  }
};

const getSystemSettings = async () => {
  const now = Date.now();

  // Return cached settings if still valid
  if (cachedSettings && (now - lastSettingsCheck) < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }

  try {
    const settings = await systemSettingsModel.findOne().lean();
    cachedSettings = settings;
    lastSettingsCheck = now;
    return settings;
  } catch (error) {
    logger.error("Error fetching system settings for maintenance check", error);
    // If we can't fetch settings, use cached or return null
    return cachedSettings || null;
  }
};

export const maintenanceModeMiddleware = async (req, res, next) => {
  try {
    // Skip whitelist check
    if (isWhitelisted(req.path)) {
      return next();
    }

    // Let browser page requests reach static/SSR so the frontend can render
    // a proper maintenance experience instead of raw JSON in the tab.
    if (!isApiRequest(req) && isDocumentNavigation(req)) {
      return next();
    }

    const settings = await getSystemSettings();

    if (settings?.app_maintenance_mode) {
      const adminActor = await getAdminActorFromRequest(req);
      if (adminActor) {
        return next();
      }

      const userAgent = req.headers["user-agent"] || "unknown";
      const ip = req.ip || req.connection.remoteAddress;

      await logger.warn("Request blocked due to maintenance mode", {
        ip,
        method: req.method,
        path: req.path,
        userAgent: userAgent.substring(0, 100)
      });

      return res.status(503).json({
        success: false,
        message: "Service Unavailable",
        detail: "The system is currently in maintenance mode. Please try again later.",
        maintenanceMode: true,
        retryAfter: 300
      });
    }

    next();
  } catch (error) {
    logger.error("Error in maintenanceModeMiddleware", error);
    // On error, allow request to proceed (fail open)
    next();
  }
};

// Function to invalidate cache when settings are updated
export const invalidateMaintenanceCache = () => {
  cachedSettings = null;
  lastSettingsCheck = 0;
};

export default maintenanceModeMiddleware;
