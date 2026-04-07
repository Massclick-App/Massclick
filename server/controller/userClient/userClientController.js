import { createUsersClients, viewUserClients, viewAllUserClients,searchUsersClient, updateUserClients, deleteUserClients } from "../../helper/userClient/userClientHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addUsersClientAction = async (req, res) => {
  try {
    const reqBody = req.body;

    if (req.authUser && req.authUser.userId) {
      reqBody.createdBy = req.authUser.userId;
    } else {
      return res.status(401).send({ message: "Unauthorized: Missing userId" });
    }

    const result = await createUsersClients(reqBody);
    res.send(result);

  } catch (error) {
    console.error("Error in addUsersClientAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewUsersClientAction = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await viewUserClients(userId);
        res.send(user);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const viewAllUsersClientAction = async (req, res) => {
  try {
    const { userRole, userId } = req.authUser; 

    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = (req.query.search || "").trim();
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

    const { list, total } = await viewAllUserClients({
      role: userRole,   
      userId,          
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    return res.send({
      data: list,
      total,
      pageNo,
      pageSize
    });

  } catch (error) {
    console.error("Error in viewAllUsersClientAction:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateUsersClientAction = async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = req.body;
        const user = await updateUserClients(userId, userData);
        res.send(user);
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const deleteUsersClientAction = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await deleteUserClients(userId);
        res.send({ message: "User deleted successfully", user });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const searchUsersClientAction = async (req, res) => {
  try {
    const query = req.query.query?.trim() || "";

    if (!query) {
      return res.send([]);
    }

    const result = await searchUsersClient(query);

    res.send(result);

  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: error.message });
  }
};
