import {
  createJob, deleteJob, getJobFilters, getPublicJob, listAdminJobs, listApplications,
  listPublicJobs, submitApplication, updateApplication, updateJob,
} from "../../helper/hiring/hiringHelper.js";

const ok = (res, data, message) => res.send({ success: true, data, ...(message ? { message } : {}) });
const fail = (res, error) => res.status(400).send({ success: false, message: error.message });

export const listPublicJobsAction = async (req, res) => {
  try { return ok(res, await listPublicJobs(req.query)); } catch (error) { return fail(res, error); }
};
export const getJobFiltersAction = async (_req, res) => {
  try { return ok(res, await getJobFilters()); } catch (error) { return fail(res, error); }
};
export const getPublicJobAction = async (req, res) => {
  try { return ok(res, await getPublicJob(req.params.idOrSlug)); } catch (error) { return fail(res, error); }
};
export const submitApplicationAction = async (req, res) => {
  try { return ok(res, await submitApplication(req.params.jobId, req.body), "Application submitted successfully"); } catch (error) { return fail(res, error); }
};
export const listAdminJobsAction = async (req, res) => {
  try { return ok(res, await listAdminJobs(req.query)); } catch (error) { return fail(res, error); }
};
export const createJobAction = async (req, res) => {
  try { return ok(res, await createJob(req.body, req.authActor?.subjectId), "Vacancy created successfully"); } catch (error) { return fail(res, error); }
};
export const updateJobAction = async (req, res) => {
  try { return ok(res, await updateJob(req.params.id, req.body, req.authActor?.subjectId), "Vacancy updated successfully"); } catch (error) { return fail(res, error); }
};
export const deleteJobAction = async (req, res) => {
  try { return ok(res, await deleteJob(req.params.id), "Vacancy deleted successfully"); } catch (error) { return fail(res, error); }
};
export const listApplicationsAction = async (req, res) => {
  try { return ok(res, await listApplications(req.query)); } catch (error) { return fail(res, error); }
};
export const updateApplicationAction = async (req, res) => {
  try { return ok(res, await updateApplication(req.params.id, req.body), "Application updated successfully"); } catch (error) { return fail(res, error); }
};
