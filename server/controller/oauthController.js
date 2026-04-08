import OAuth2Server from 'oauth2-server';
import { BAD_REQUEST, UNAUTHORIZED } from "../errorCodes.js";
import {
  oauthAuthentication,
  oauthValidation,
  logoutUsers,
  oauthtoken
} from "../helper/oauthHelper.js";

// ---------- PASSWORD LOGIN ----------
export const oauthAction = async (req, res) => {
  try {
    const result = await oauthValidation(req);

    if (result.error) {
      return res.status(401).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
};

// ---------- CLIENT TOKEN (FIXED) ----------
export const oauthClientAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request({
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: {
        grant_type: 'client_credentials',
        client_id: req.body.clientId,
        client_secret: req.body.clientSecret,
      },
    });

    const response = new OAuth2Server.Response(res);

    const token = await oauthtoken.token(request, response);

    res.json(token);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
};

// ---------- REFRESH TOKEN (FIXED) ----------
export const oauthReAction = async (req, res) => {
  try {
    const request = new OAuth2Server.Request({
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: {
        grant_type: 'refresh_token',
        refresh_token: req.body.refresh_token,
        client_id: req.body.client_id,
        client_secret: req.body.client_secret,
      },
    });

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
