import { BAD_REQUEST } from "../../errorCodes.js";
import { listMassclickEvents, removeMassclickEvent, saveMassclickEvent, uploadMassclickEventMedia, viewMassclickEvent } from "../../helper/massclickEvent/massclickEventHelper.js";

const fail = (res, error) => res.status(BAD_REQUEST.code).send({ success: false, message: error.message });

export const listPublicMassclickEventsAction = async (req, res) => {
  try {
    const result = await listMassclickEvents({ publishedOnly: true, pageNo: req.query.pageNo, pageSize: req.query.pageSize });
    res.send({ success: true, ...result });
  } catch (error) { console.error("listPublicMassclickEventsAction error:", error); fail(res, error); }
};
export const listMassclickEventsAction = async (req, res) => {
  try {
    const result = await listMassclickEvents({
      pageNo: req.query.pageNo,
      pageSize: req.query.pageSize,
      search: req.query.search,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });
    res.send({ success: true, ...result });
  } catch (error) { console.error("listMassclickEventsAction error:", error); fail(res, error); }
};
export const viewMassclickEventAction = async (req, res) => {
  try {
    const data = await viewMassclickEvent(req.params.id);
    res.send({ success: true, data });
  } catch (error) { console.error("viewMassclickEventAction error:", error); fail(res, error); }
};
export const uploadMassclickEventMediaAction = async (req, res) => {
  try {
    const data = await uploadMassclickEventMedia(req.body);
    res.status(201).send({ success: true, data });
  } catch (error) { console.error("uploadMassclickEventMediaAction error:", error); fail(res, error); }
};
export const createMassclickEventAction = async (req, res) => {
  try {
    const data = await saveMassclickEvent(null, { ...req.body, userId: req.user?._id || req.userId });
    res.status(201).send({ success: true, data });
  } catch (error) { console.error("createMassclickEventAction error:", error); fail(res, error); }
};
export const updateMassclickEventAction = async (req, res) => {
  try {
    const data = await saveMassclickEvent(req.params.id, { ...req.body, userId: req.user?._id || req.userId });
    res.send({ success: true, data });
  } catch (error) { console.error("updateMassclickEventAction error:", error); fail(res, error); }
};
export const deleteMassclickEventAction = async (req, res) => {
  try {
    await removeMassclickEvent(req.params.id);
    res.send({ success: true });
  } catch (error) { console.error("deleteMassclickEventAction error:", error); fail(res, error); }
};
