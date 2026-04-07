import { ObjectId } from "mongodb";
import userClientModel from "../../model/userClientModel/userClientModel.js"
import userModel from "../../model/userModel.js";
import mongoose from "mongoose";


export const createUsersClients = async function (reqBody = {}) {
  try {
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2); 
    const month = String(now.getMonth() + 1).padStart(2, "0"); 
    const day = String(now.getDate()).padStart(2, "0");  
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const clientId = `MC${year}${month}${day}${hours}${minutes}${seconds}`;

    const data = {
      ...reqBody,
      clientId, 
    };

    const usersClientDocument = new userClientModel(data);
    const result = await usersClientDocument.save();
    return result;
  } catch (error) {
    if (error.message && error.message.duplicateKey) {
      throw error;
    }
    console.error("Error saving userClient:", error);
    throw error;
  }
};


export const viewUserClients = async (id) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("Invalid user ID");
        }

        const userClient = await userClientModel.findById(id).lean();
        if (!userClient) {
            throw new Error("userClient not found");
        }

        return userClient;
    } catch (error) {
        console.error("Error in getUserById:", error);
        throw error;
    }
};

export const viewAllUserClients = async ({
  role,
  userId,
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder
}) => {
  try {
    let query = {};

  
    if (role === "SuperAdmin") {
      query = {};
    }
    else if (role === "SalesManager") {
      const manager = await userModel.findById(userId).lean();
      const salesOfficerIds = manager?.salesBy || [];

      const allowedCreators = [
        new mongoose.Types.ObjectId(userId),
        ...salesOfficerIds.map(id => new mongoose.Types.ObjectId(id))
      ];

      query = { createdBy: { $in: allowedCreators } };
    }
    else if (role === "SalesOfficer") {
      query = { createdBy: new mongoose.Types.ObjectId(userId) };
    }
    else if (["client", "PublicUser", "user"].includes(role)) {
      query = { isActive: true };
    }
    else {
      throw new Error("Unauthorized role");
    }

  
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;


    if (search) {
      query.$or = [
        { clientId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { emailId: { $regex: search, $options: "i" } },
        { contact: { $regex: search, $options: "i" } },
        { businessName: { $regex: search, $options: "i" } },
        { businessAddress: { $regex: search, $options: "i" } }
      ];
    }

 
    const allowedSortFields = [
      "createdAt",
      "name",
      "businessName",
      "emailId"
    ];

    const sort = {};
    if (allowedSortFields.includes(sortBy)) {
      sort[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }

    const total = await userClientModel.countDocuments(query);

    const usersClient = await userClientModel
      .find(query)
      .sort(sort)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list: usersClient, total };

  } catch (error) {
    console.error("Error fetching user clients:", error);
    throw error;
  }
};

export const updateUserClients = async (id, data) => {
    if (!ObjectId.isValid(id)) throw new Error("Invalid user ID");

    const updatedUserClient = await userClientModel.findByIdAndUpdate(id, data, { new: true });
    if (!updatedUserClient) throw new Error("updatedUserClient not found");
    return updatedUserClient;
};

export const deleteUserClients = async (id) => {
    if (!ObjectId.isValid(id)) throw new Error("Invalid deletelocation ID");

  const user = await userClientModel.findByIdAndUpdate(
    id,
    { isActive: false, updatedAt: new Date() }, 
    { new: true } 
  );

  if (!user) throw new Error("UserClient not found");

  return user;
};

export const searchUsersClient = async (query) => {
  try {
    return await userClientModel
      .find(
        {
          $or: [
            { clientId: { $regex: query, $options: "i" } },
            { name: { $regex: query, $options: "i" } }
          ],
          isActive: true
        },
        { clientId: 1, name: 1 }
      )
      .limit(20)
      .lean();
  } catch (error) {
    console.error("Error searching userClient:", error);
    throw error;
  }
};
