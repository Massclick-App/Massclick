import { getBusinessPersonReport, getBusinessReportFilters, listBusinessPeople, listReportBusinesses } from "../../helper/businessPersonReport/businessPersonReportHelper.js";

export const listBusinessPeopleAction = async (req, res) => {
  try { res.send({ data: await listBusinessPeople(req.query.search) }); }
  catch (error) { res.status(400).send({ message: error.message }); }
};

export const businessPersonReportAction = async (req, res) => {
  try { res.send(await getBusinessPersonReport(req.query)); }
  catch (error) { res.status(400).send({ message: error.message }); }
};

export const businessReportFiltersAction = async (req, res) => {
  try { res.send(await getBusinessReportFilters(req.query)); }
  catch (error) { res.status(400).send({ message: error.message }); }
};

export const reportBusinessesAction = async (req, res) => {
  try { res.send(await listReportBusinesses(req.query)); }
  catch (error) { res.status(400).send({ message: error.message }); }
};
