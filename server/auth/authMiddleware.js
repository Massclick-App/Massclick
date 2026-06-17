import { FORBIDDEN, UNAUTHORIZED } from "../errorCodes.js";
import { logAuthAuditEvent } from "./authAuditStore.js";
import { getAuthPolicy } from "./authPolicyRegistry.js";
import {
  AuthError,
  actorToLegacyAuthUser,
  actorToLegacyChatUser,
  extractBearerToken,
  resolveAuthActorFromToken,
} from "./authResolver.js";

const respondAuthError = (res, error) => {
  const statusCode = error?.statusCode || UNAUTHORIZED.code;
  return res.status(statusCode).send({ error: error.code || error.message || "AUTH_ERROR" });
};

export const createHttpAuthMiddleware = ({
  allowedActorTypes = [],
  source = "http",
  policyKey = null,
  attachChatUser = false,
} = {}) => {
  return async (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization || "");

    try {
      const actor = await resolveAuthActorFromToken(token, { source });
      if (allowedActorTypes.length && !allowedActorTypes.includes(actor.actorType)) {
        throw new AuthError("FORBIDDEN", FORBIDDEN.code, {
          auditEventType: "forbidden_access",
        });
      }

      req.authActor = actor;
      req.authUser = actorToLegacyAuthUser(actor);
      req.authPolicy = policyKey ? getAuthPolicy(policyKey) : null;

      if (attachChatUser) {
        req.chatUser = actorToLegacyChatUser(actor);
      }

      next();
    } catch (error) {
      const authError =
        error instanceof AuthError
          ? error
          : new AuthError("AUTH_ERROR", UNAUTHORIZED.code, {
              auditEventType: "invalid_token",
            });

      logAuthAuditEvent({
        eventType: authError.metadata?.auditEventType || "invalid_token",
        actor: req.authActor || null,
        source,
        req,
        statusCode: authError.statusCode || UNAUTHORIZED.code,
        message: authError.code || authError.message,
      });

      return respondAuthError(res, authError);
    }
  };
};

const readFirstScopedValue = (req, fieldNames = ["userId"]) => {
  for (const fieldName of fieldNames) {
    if (req.params?.[fieldName]) return req.params[fieldName];
    if (req.body?.[fieldName]) return req.body[fieldName];
    if (req.query?.[fieldName]) return req.query[fieldName];
  }
  return null;
};

export const requireAuthPolicy = (policyKey, options = {}) => {
  const policy = getAuthPolicy(policyKey);
  if (!policy) {
    throw new Error(`Unknown auth policy: ${policyKey}`);
  }

  return createHttpAuthMiddleware({
    allowedActorTypes: policy.allowedActorTypes,
    policyKey,
    ...options,
  });
};

export const requireAdminAuth = (policyKey = null, options = {}) =>
  createHttpAuthMiddleware({
    allowedActorTypes: ["admin"],
    policyKey,
    ...options,
  });

export const resolveEffectiveSubjectId = (
  req,
  {
    allowAdminOverride = false,
    fieldNames = ["userId"],
  } = {}
) => {
  if (!req.authActor) {
    throw new AuthError("AUTH_REQUIRED", UNAUTHORIZED.code, {
      auditEventType: "invalid_token",
    });
  }

  if (req.authActor.actorType === "admin" && allowAdminOverride) {
    return readFirstScopedValue(req, fieldNames) || req.authActor.subjectId;
  }

  return req.authActor.subjectId;
};

export const assertSelfOnlyMobileAccess = (req, { paramName = "mobile" } = {}) => {
  if (!req.authActor) {
    throw new AuthError("AUTH_REQUIRED", UNAUTHORIZED.code, {
      auditEventType: "invalid_token",
    });
  }

  if (req.authActor.actorType === "admin") {
    return;
  }

  const requestedMobile = String(req.params?.[paramName] || "").trim();
  const actorMobile = String(req.authActor.mobile || "").trim();

  if (!requestedMobile || !actorMobile || requestedMobile !== actorMobile) {
    logAuthAuditEvent({
      eventType: "forbidden_self_foreign_access",
      actor: req.authActor,
      source: "http",
      req,
      statusCode: FORBIDDEN.code,
      message: "Customer attempted to access another customer's mobile scope",
    });

    throw new AuthError("FORBIDDEN", FORBIDDEN.code, {
      auditEventType: "forbidden_self_foreign_access",
    });
  }
};
