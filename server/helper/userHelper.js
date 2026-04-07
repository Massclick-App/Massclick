import { ObjectId } from "mongodb";
import userModel from "../model/userModel.js"
import { uploadImageToS3, getSignedUrlByKey } from "../s3Uploder.js";
import bcrypt from "bcrypt";

const updateManagerSalesBy = async (officerId, newManagerId, oldManagerId) => {
  if (oldManagerId && ObjectId.isValid(oldManagerId)) {
    await userModel.findByIdAndUpdate(oldManagerId, {
      $pull: { salesBy: officerId }
    }, { new: false });
  }

  if (newManagerId && ObjectId.isValid(newManagerId)) {
    await userModel.findByIdAndUpdate(newManagerId, {
      $addToSet: { salesBy: officerId }
    }, { new: false });
  }
};

export const createUsers = async function (reqBody = {}) {
  try {

    if (reqBody.password) {
      const saltRounds = 10;
      reqBody.password = await bcrypt.hash(reqBody.password, saltRounds);
    }

    if (reqBody.userProfile) {
      const uploadResult = await uploadImageToS3(
        reqBody.userProfile,
        `admin/users/profile-${Date.now()}`
      );
      delete reqBody.userProfile;
      reqBody.userProfileKey = uploadResult.key;
    }

    if (reqBody.managedBy) {
      reqBody.managedBy = new ObjectId(reqBody.managedBy);
    } else if (reqBody.role === 'SalesOfficer') {
      reqBody.managedBy = null;
    }

    const usersDocument = new userModel(reqBody);
    const result = await usersDocument.save();

    if (result.role === 'SalesOfficer' && result.managedBy) {
      await updateManagerSalesBy(result._id, result.managedBy, null);
    }

    return result;
  } catch (error) {
    if (error.message && error.message.includes('duplicate key')) {
      throw new Error("A user with this UserName or EmailId already exists.");
    }
    console.error('Error saving userDocument:', error);
    throw error;
  }
};

export const viewUser = async (id) => {
  try {
    if (!ObjectId.isValid(id)) {
      throw new Error("Invalid user ID");
    }

    const user = await userModel.findById(id).lean();
    if (!user) {
      throw new Error("User not found");
    }
    if (user.userProfileKey) {
      user.userProfileKey = getSignedUrlByKey(user.userProfileKey);
    }
    return user;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw error;
  }
};
export const viewAllUser = async ({
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder
}) => {
  try {
    let query = {};

    // 🔍 SEARCH (Name, Email, Role, Contact, etc.)
    if (search && search.trim().length > 0) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { emailId: { $regex: search, $options: "i" } },
        { role: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { businessLocation: { $regex: search, $options: "i" } },
        { businessCategory: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    let sortQuery = {};
    if (sortBy) sortQuery[sortBy] = sortOrder;

    const total = await userModel.countDocuments(query);

    const users = await userModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const list = users.map((user) => {
      if (user.userProfileKey) {
        user.userProfile = getSignedUrlByKey(user.userProfileKey);
      }
      return user;
    });

    return { list, total };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const updateUser = async (id, data) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid user ID");

  const existingUser = await userModel.findById(id);
  if (!existingUser) throw new Error("User not found");

  if (data.password) {
    const saltRounds = 10;
    data.password = await bcrypt.hash(data.password, saltRounds);
  }

  const oldManagerId = existingUser.managedBy;
  let newManagerId = data.managedBy;

  if (newManagerId && typeof newManagerId === 'string') {
    newManagerId = new ObjectId(newManagerId);
  } else if (newManagerId === "") {
    newManagerId = null;
  }

  if (data.userProfile && typeof data.userProfile === "string" && data.userProfile.startsWith("data:image")) {
    const uploadResult = await uploadImageToS3(
      data.userProfile,
      `admin/users/profile-${Date.now()}`
    );
    data.userProfileKey = uploadResult.key;
  } else if (data.userProfile === null || data.userProfile === "") {
    data.userProfileKey = "";
  }
  delete data.userProfile;

  data.managedBy = newManagerId;

  const updatedUser = await userModel.findByIdAndUpdate(id, data, { new: true });
  if (!updatedUser) throw new Error("User not found");

  if (updatedUser.role === 'SalesOfficer') {
    const currentManagerId = updatedUser.managedBy;

    const managerChanged = (!currentManagerId && oldManagerId) ||
      (currentManagerId && !oldManagerId) ||
      (currentManagerId && oldManagerId && !currentManagerId.equals(oldManagerId));

    if (managerChanged) {
      await updateManagerSalesBy(id, currentManagerId, oldManagerId);
    }
  }

  return updatedUser;
};

export const deleteUser = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid user ID");

  const userToDeactivate = await userModel.findById(id);
  if (!userToDeactivate) throw new Error("User not found");

  if (userToDeactivate.role === 'SalesOfficer' && userToDeactivate.managedBy) {
    await updateManagerSalesBy(id, null, userToDeactivate.managedBy);
  }

  const user = await userModel.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!user) throw new Error("User not found");
  return user;
};