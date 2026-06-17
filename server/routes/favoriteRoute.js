import express from "express";
import {
  addFavoriteAction,
  removeFavoriteAction,
  listFavoritesAction,
  checkFavoriteAction,
} from "../controller/favorite/favoriteController.js";
import { requireAuthPolicy } from "../auth/authMiddleware.js";

const router = express.Router();

router.post("/api/favorites/add", requireAuthPolicy("favorites.add"), addFavoriteAction);
router.post("/api/favorites/remove", requireAuthPolicy("favorites.remove"), removeFavoriteAction);
router.get("/api/favorites/list", requireAuthPolicy("favorites.list"), listFavoritesAction);
router.get("/api/favorites/check", requireAuthPolicy("favorites.check"), checkFavoriteAction);

export default router;
