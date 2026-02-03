import { createLocation, viewLocation, viewAllLocation, updateLocation, deleteLocation, detectDistrictFromLatLng } from "../../helper/location/locationHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addLocationAction = async (req, res) => {
    try {
        const reqBody = req.body;
        const result = await createLocation(reqBody);
        res.send(result);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send(error.message);
    }
};

export const viewLocationAction = async (req, res) => {
    try {
        const locationId = req.params.id;
        const location = await viewLocation(locationId);
        res.send(location);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};

export const viewAllLocationAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || null;
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    const { list, total } = await viewAllLocation({
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    res.send({
      data: list,
      total,
      pageNo,
      pageSize,
    });

  } catch (error) {
    console.error("Location fetch error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateLocationAction = async (req, res) => {
    try {
        const locationId = req.params.id;
        const locationData = req.body;
        const location = await updateLocation(locationId, locationData);
        res.send(location);
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const deleteLocationAction = async (req, res) => {
    try {
        const locationId = req.params.id;
        const location = await deleteLocation(locationId);
        res.send({ message: "User deleted successfully", location });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const detectDistrictAction = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({
        message: "Latitude and Longitude are required",
      });
    }

    const result = await detectDistrictFromLatLng(latitude, longitude);
    res.status(200).json(result);

  } catch (error) {
    console.error("Detect district error:", error);
    res.status(400).json({ message: error.message });
  }
};
