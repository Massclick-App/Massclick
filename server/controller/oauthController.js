import OAuth2Server from 'oauth2-server';
import crypto from 'crypto';
import { BAD_REQUEST, UNAUTHORIZED } from "../errorCodes.js";
import {
  oauthAuthentication,
  logoutUsers,
  oauthtoken,
  withRequestContext,
} from "../helper/oauthHelper.js";
import { logAuthAuditEvent } from "../auth/authAuditStore.js";
import { resolveAuthActorFromToken } from "../auth/authResolver.js";

// ---------- PASSWORD LOGIN ----------
export const oauthAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);
    const token = await oauthtoken.token(request, response);
    const actor = await resolveAuthActorFromToken(token.accessToken, { source: "oauth-login" });
    logAuthAuditEvent({
      eventType: "login",
      actor,
      source: "oauth-login",
      req,
      statusCode: 200,
      message: "Admin session created",
    });
    return res.status(200).json(token);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// ---------- CLIENT TOKEN ----------
export const oauthClientAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);
    const token = await withRequestContext(req.body, () => oauthtoken.token(request, response));
    const actor = await resolveAuthActorFromToken(token.accessToken, { source: "oauth-client" });
    logAuthAuditEvent({
      eventType: "login",
      actor,
      source: "oauth-client",
      req,
      statusCode: 200,
      message: "Public client session created",
    });
    res.json(token);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// ---------- REFRESH TOKEN ----------
export const oauthReAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);
    const token = await oauthtoken.token(request, response);
    const actor = await resolveAuthActorFromToken(token.accessToken, { source: "oauth-refresh" });
    logAuthAuditEvent({
      eventType: "refresh",
      actor,
      source: "oauth-refresh",
      req,
      statusCode: 200,
      message: "OAuth session refreshed",
    });
    res.json(token);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

// ---------- PROTECTED ROUTE ----------
export const oauthToken = async (req, res) => {
  try {
    await oauthAuthentication(req, res, () => {
      res.send(req.authUser);
    });
  } catch (error) {
    return res.status(BAD_REQUEST.code).send(error.message);
  }
};

// ---------- LOGOUT ----------
export const logoutAction = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(" ")[1];
    if (!accessToken) {
      return res.status(UNAUTHORIZED.code).json({ error: "No token provided." });
    }
    const actor = await resolveAuthActorFromToken(accessToken, { source: "oauth-logout" });
    const result = await logoutUsers(accessToken);
    if (!result) {
      return res.status(BAD_REQUEST.code).json({ error: "Logout failed" });
    }
    logAuthAuditEvent({
      eventType: "logout",
      actor,
      source: "oauth-logout",
      req,
      statusCode: 200,
      message: "Session logged out",
    });
    logAuthAuditEvent({
      eventType: "revocation",
      actor,
      source: "oauth-logout",
      req,
      statusCode: 200,
      message: "Session token revoked",
    });
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(BAD_REQUEST.code).json({ error: error.message });
  }
};
