import express from "express";
import {
  addFavoriteAction,
  removeFavoriteAction,
  listFavoritesAction,
  checkFavoriteAction,
} from "../controller/favorite/favoriteController.js";
import { oauthAuthentication } from "../helper/oauthHelper.js";

const router = express.Router();

router.post("/api/favorites/:businessId", oauthAuthentication, addFavoriteAction);
router.delete("/api/favorites/:businessId", oauthAuthentication, removeFavoriteAction);
router.get("/api/favorites", oauthAuthentication, listFavoritesAction);
router.get("/api/favorites/check/:businessId", oauthAuthentication, checkFavoriteAction);

export default router;