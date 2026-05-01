import oauthModel from "../model/oauthModel.js";
import userModel from "../model/msg91Model/usersModels.js";

export const wsAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("AUTH_REQUIRED"));

    const tokenDoc = await oauthModel.findOne({
      accessToken: token,
      isRevoked: false,
    }).lean();

    if (!tokenDoc) return next(new Error("INVALID_TOKEN"));

    if (new Date(tokenDoc.accessTokenExpiresAt) < new Date()) {
      return next(new Error("TOKEN_EXPIRED"));
    }

    // Fetch mobileNumber1 for room assignment — stored in userModel, not in oauthModel
    const user = await userModel.findById(
      tokenDoc.user.userId,
      { mobileNumber1: 1 }
    ).lean();

    if (!user) return next(new Error("USER_NOT_FOUND"));

    socket.data.user = {
      ...tokenDoc.user,
      mobileNumber1: user.mobileNumber1,
    };

    next();
  } catch (err) {
    console.error("[WS Auth]", err.message);
    next(new Error("AUTH_ERROR"));
  }
};
