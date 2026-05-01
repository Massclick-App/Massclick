import jwt from "jsonwebtoken";
import userModel from "../model/msg91Model/usersModels.js";

export const wsAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("AUTH_REQUIRED"));

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("INVALID_TOKEN"));
    }

    const user = await userModel.findById(
      payload.userId,
      { mobileNumber1: 1 }
    ).lean();

    if (!user) return next(new Error("USER_NOT_FOUND"));

    socket.data.user = {
      userId: payload.userId,
      mobile: payload.mobile,
      mobileNumber1: user.mobileNumber1,
    };

    next();
  } catch (err) {
    console.error("[WS Auth]", err.message);
    next(new Error("AUTH_ERROR"));
  }
};
