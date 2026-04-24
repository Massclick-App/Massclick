import favoriteModel from "../../model/favorite/favoriteModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";

export const addFavorite = async (userId, businessId) => {
  const exists = await favoriteModel.findOne({ userId, businessId });
  if (exists) {
    const error = new Error("Already favorited");
    error.code = "DUPLICATE";
    throw error;
  }

  const favorite = new favoriteModel({ userId, businessId });
  await favorite.save();

  await businessListModel.findByIdAndUpdate(
    businessId,
    { $inc: { favoritesCount: 1 } }
  );

  return favorite;
};

export const removeFavorite = async (userId, businessId) => {
  const favorite = await favoriteModel.findOneAndDelete({ userId, businessId });
  if (!favorite) {
    const error = new Error("Favorite not found");
    error.code = "NOT_FOUND";
    throw error;
  }

  await businessListModel.findByIdAndUpdate(
    businessId,
    { $inc: { favoritesCount: -1 } }
  );

  return favorite;
};

export const listFavorites = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const [favorites, total] = await Promise.all([
    favoriteModel
      .find({ userId })
      .populate("businessId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    favoriteModel.countDocuments({ userId }),
  ]);

  const businessList = favorites
    .map((f) => f.businessId)
    .filter(Boolean);

  return {
    favorites: businessList,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const checkFavorite = async (userId, businessId) => {
  const favorite = await favoriteModel.findOne({ userId, businessId });
  return { isFavorite: !!favorite };
};