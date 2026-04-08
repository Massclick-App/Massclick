import OAuth2Server from 'oauth2-server';
import { BAD_REQUEST, UNAUTHORIZED } from "../errorCodes.js";
import {
  oauthAuthentication,
  logoutUsers,
  oauthtoken
} from "../helper/oauthHelper.js";

// ---------- PASSWORD LOGIN ----------
export const oauthAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request(req);
    const response = new OAuth2Server.Response(res);

    const token = await oauthtoken.token(request, response);

    return res.status(200).json(token);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

// ---------- CLIENT TOKEN (FIXED) ----------
export const oauthClientAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request(req);   // ✅ FULL EXPRESS REQUEST
    const response = new OAuth2Server.Response(res);

    const token = await oauthtoken.token(request, response);

    res.json(token);
  } catch (error) {
    console.error("OAUTH CLIENT ERROR:", error);
    res.status(400).json({ error: error.message });
  }
};

// ---------- REFRESH TOKEN (FIXED) ----------
export const oauthReAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request(req);   // ✅ FIX
    const response = new OAuth2Server.Response(res);

    const token = await oauthtoken.token(request, response);

    res.json(token);
  } catch (error) {
    console.error("Refresh error:", error);
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
    console.error(error);
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

    const result = await logoutUsers(accessToken);

    if (!result) {
      return res.status(BAD_REQUEST.code).json({ error: "Logout failed" });
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(BAD_REQUEST.code).json({ error: error.message });
  }
};
