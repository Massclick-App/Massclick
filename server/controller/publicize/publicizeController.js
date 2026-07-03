import {
  createPublicize,
  viewPublicize,
  viewAllPublicize,
  updatePublicize,
  deletePublicize,
  initiatePublicizePayment,
} from "../../helper/publicize/publicizeHelper.js";

import { BAD_REQUEST } from "../../errorCodes.js";

export const addPublicizeAction = async (req, res) => {
  try {
    const result = await createPublicize(req.body);
    return res.status(201).send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewPublicizeAction = async (req, res) => {
  try {
    const publicize = await viewPublicize(req.params.id);
    return res.send(publicize);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllPublicizeAction = async (req, res) => {
  try {
    const allPublicize = await viewAllPublicize();
    return res.send(allPublicize);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updatePublicizeAction = async (req, res) => {
  try {
    const publicize = await updatePublicize(req.params.id, req.body);
    return res.send(publicize);
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

export const deletePublicizeAction = async (req, res) => {
  try {
    const publicize = await deletePublicize(req.params.id);
    return res.send({
      message: "Publicize deleted successfully",
      publicize,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).send({ message: error.message });
  }
};

export const initiatePublicizePaymentAction = async (req, res) => {
  try {
    const result = await initiatePublicizePayment(req.body);
    return res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};
