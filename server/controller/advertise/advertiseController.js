import {
  createAdvertise,
  viewAdvertise,
  viewAllAdvertise,
  updateAdvertise,
  deleteAdvertise,
} from "../../helper/advertise/advertiseHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";

export const addAdvertiseAction = async (req, res) => {
  try {
    const result = await createAdvertise(req.body);
    return res.status(201).send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAdvertiseAction = async (req, res) => {
  try {
    const advertise = await viewAdvertise(req.params.id);
    return res.send(advertise);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllAdvertiseAction = async (req, res) => {
  try {
    const allAdvertise = await viewAllAdvertise();
    return res.send(allAdvertise);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateAdvertiseAction = async (req, res) => {
  try {
    const advertise = await updateAdvertise(req.params.id, req.body);
    return res.send(advertise);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

export const deleteAdvertiseAction = async (req, res) => {
  try {
    const advertise = await deleteAdvertise(req.params.id);
    return res.send({
      message: "Advertise deleted successfully",
      advertise,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};
