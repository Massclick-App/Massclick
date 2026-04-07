import { ObjectId } from "mongodb";
import rolesModel from "../../model/roles/rolesModel.js"

export const createRoles = async function (reqBody = {}) {
    try {

        const data = {
            ...reqBody,
        };
        const rolesDocument = new rolesModel(data);
        const result = await rolesDocument.save();
        return result;
    } catch (error) {
        if (error.message && error.message.duplicateKey) {
            throw error;
        }
        console.error('Error saving roles:', error);
        throw error;
    }
};

export const viewRoles = async (id) => {
    try {
        if (!ObjectId.isValid(id)) {
            throw new Error("Invalid roles ID");
        }

        const roles = await rolesModel.findById(id).lean();
        if (!roles) {
            throw new Error("roles not found");
        }

        return roles;
    } catch (error) {
        console.error("Error in getRolesById:", error);
        throw error;
    }
};

export const viewAllRoles = async ({
  pageNo,
  pageSize,
  search,
  status,
  sortBy,
  sortOrder
}) => {
  try {
    let query = {};

    if (search && search.trim() !== "") {
      query.$or = [
        { roleName: { $regex: search, $options: "i" } },
        { permissions: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { createdBy: { $regex: search, $options: "i" } }
      ];
    }

    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    let sortQuery = {};
    if (sortBy) sortQuery[sortBy] = sortOrder;

    const total = await rolesModel.countDocuments(query);

    const roles = await rolesModel
      .find(query)
      .sort(sortQuery)
      .skip((pageNo - 1) * pageSize)
      .limit(pageSize)
      .lean();

    return { list: roles, total };

  } catch (error) {
    console.error("Error fetching roles:", error);
    throw error;
  }
};

export const updateRoles = async (id, data) => {
    if (!ObjectId.isValid(id)) throw new Error("Invalid roles ID");

    const roles = await rolesModel.findByIdAndUpdate(id, data, { new: true });
    if (!roles) throw new Error("roles not found");
    return roles;
};

export const deleteRoles = async (id) => {
    if (!ObjectId.isValid(id)) throw new Error("Invalid deleteroles ID");

    const deletedroles = await rolesModel.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
    ); if (!deletedroles) throw new Error("roles not found");
    return deletedroles;
};