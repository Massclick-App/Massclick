import { ObjectId } from "mongodb";
import eventCategoryModel from "../../model/event/eventCategoryModel.js";

export const createEventCategory = async (reqBody = {}) => {
  try {
    const categoryName = reqBody.categoryName?.trim().toLowerCase();
    if (!categoryName) throw new Error("Category name is required");

    const existing = await eventCategoryModel.findOne({
      categoryName: { $regex: `^${categoryName}$`, $options: "i" }
    });

    if (existing) {
      throw new Error("Event category with this name already exists");
    }

    const eventCategory = new eventCategoryModel({
      categoryName: reqBody.categoryName,
      description: reqBody.description || "",
      categoryImage: reqBody.categoryImage || "",
      keywords: reqBody.keywords || [],
      seoTitle: reqBody.seoTitle || "",
      seoDescription: reqBody.seoDescription || "",
      isActive: reqBody.isActive !== undefined ? reqBody.isActive : true,
      sortOrder: reqBody.sortOrder || 0,
      createdBy: reqBody.createdBy || null,
    });

    const result = await eventCategory.save();
    return { message: "Event category created", category: result };
  } catch (error) {
    throw error;
  }
};

export const viewEventCategory = async (categoryId) => {
  try {
    if (!ObjectId.isValid(categoryId)) {
      throw new Error("Invalid category ID");
    }

    const category = await eventCategoryModel.findById(categoryId);
    if (!category) {
      throw new Error("Event category not found");
    }

    return { message: "Event category retrieved", category };
  } catch (error) {
    throw error;
  }
};

export const viewAllEventCategory = async (options = {}) => {
  try {
    const { pageNo = 1, pageSize = 10, search = "", status = "all", sortBy = "createdAt", sortOrder = -1 } = options;

    const skip = (pageNo - 1) * pageSize;
    const query = {};

    if (search) {
      query.$or = [
        { categoryName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const sortQuery = {};
    if (sortBy) {
      sortQuery[sortBy] = sortOrder;
    }

    const list = await eventCategoryModel
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(pageSize));

    const total = await eventCategoryModel.countDocuments(query);

    return { list, total };
  } catch (error) {
    throw error;
  }
};

export const updateEventCategory = async (categoryId, updateData) => {
  try {
    if (!ObjectId.isValid(categoryId)) {
      throw new Error("Invalid category ID");
    }

    const category = await eventCategoryModel.findById(categoryId);
    if (!category) {
      throw new Error("Event category not found");
    }

    // Check for duplicate name (excluding current document)
    if (updateData.categoryName && updateData.categoryName !== category.categoryName) {
      const existing = await eventCategoryModel.findOne({
        categoryName: { $regex: `^${updateData.categoryName.trim()}$`, $options: "i" },
        _id: { $ne: categoryId }
      });

      if (existing) {
        throw new Error("Event category with this name already exists");
      }
    }

    const updatedCategory = await eventCategoryModel.findByIdAndUpdate(
      categoryId,
      {
        ...updateData,
        updatedBy: updateData.updatedBy || null,
      },
      { new: true, runValidators: true }
    );

    return { message: "Event category updated", category: updatedCategory };
  } catch (error) {
    throw error;
  }
};

export const deleteEventCategory = async (categoryId) => {
  try {
    if (!ObjectId.isValid(categoryId)) {
      throw new Error("Invalid category ID");
    }

    const category = await eventCategoryModel.findByIdAndUpdate(
      categoryId,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      throw new Error("Event category not found");
    }

    return { message: "Event category deleted", category };
  } catch (error) {
    throw error;
  }
};

export const hardDeleteEventCategory = async (categoryId) => {
  try {
    if (!ObjectId.isValid(categoryId)) {
      throw new Error("Invalid category ID");
    }

    const category = await eventCategoryModel.findByIdAndDelete(categoryId);
    if (!category) {
      throw new Error("Event category not found");
    }

    return { message: "Event category permanently deleted", category };
  } catch (error) {
    throw error;
  }
};
