import express from "express";
import {
  addFavoriteAction,
  removeFavoriteAction,
  listFavoritesAction,
  checkFavoriteAction,
} from "../controller/favorite/favoriteController.js";

const router = express.Router();

router.post("/api/favorites/add", addFavoriteAction);
router.post("/api/favorites/remove", removeFavoriteAction);
router.get("/api/favorites/list", listFavoritesAction);
router.get("/api/favorites/check", checkFavoriteAction);

export default router;