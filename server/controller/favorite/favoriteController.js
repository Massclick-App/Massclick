import {
  addFavorite,
  removeFavorite,
  listFavorites,
  checkFavorite,
} from "../../helper/favorite/favoriteHelper.js";
import { BAD_REQUEST, NOT_FOUND, CONFLICT } from "../../errorCodes.js";

export const addFavoriteAction = async (req, res) => {
  try {
    const { businessId, userId } = req.body;

    if (!userId) {
      return res.status(BAD_REQUEST.code).send({ message: "User ID required" });
    }

    if (!businessId) {
      return res.status(BAD_REQUEST.code).send({ message: "Business ID required" });
    }

    const favorite = await addFavorite(userId, businessId);
    res.send({ success: true, data: favorite });

  } catch (error) {
    if (error.code === "DUPLICATE") {
      return res.status(CONFLICT.code).send({ message: error.message });
    }
    console.error("addFavoriteAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const removeFavoriteAction = async (req, res) => {
  try {
    const { businessId, userId } = req.body;

    if (!userId) {
      return res.status(BAD_REQUEST.code).send({ message: "User ID required" });
    }

    if (!businessId) {
      return res.status(BAD_REQUEST.code).send({ message: "Business ID required" });
    }

    await removeFavorite(userId, businessId);
    res.send({ success: true, message: "Removed from favorites" });

  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(NOT_FOUND.code).send({ message: error.message });
    }
    console.error("removeFavoriteAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const listFavoritesAction = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(BAD_REQUEST.code).send({ message: "User ID required" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await listFavorites(userId, page, limit);
    res.send(result);

  } catch (error) {
    console.error("listFavoritesAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const checkFavoriteAction = async (req, res) => {
  try {
    const { businessId } = req.query;
    const { userId } = req.query;

    if (!userId) {
      return res.status(BAD_REQUEST.code).send({ message: "User ID required" });
    }

    if (!businessId) {
      return res.status(BAD_REQUEST.code).send({ message: "Business ID required" });
    }

    const result = await checkFavorite(userId, businessId);
    res.send(result);

  } catch (error) {
    console.error("checkFavoriteAction error:", error);
    res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};