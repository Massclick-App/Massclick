import rolesModel from "../model/roles/rolesModel.js";

export const getRolePermissions = async (roleName) => {
  if (!roleName || roleName === "client" || roleName === "customer") {
    return [];
  }

  const roleDoc = await rolesModel.findOne({ roleName, isActive: true }).lean();
  return Array.isArray(roleDoc?.permissions) ? roleDoc.permissions : [];
};
