import mongoose from "mongoose";
import { Buffer } from "node:buffer";
import jobVacancyModel from "../../model/hiring/jobVacancyModel.js";
import jobApplicationModel from "../../model/hiring/jobApplicationModel.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../../s3Uploder.js";
import { s3Keys } from "../../utils/s3ObjectKeys.js";

const clean = (value) => String(value || "").trim();
const slugify = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const asList = (value) => (Array.isArray(value) ? value : String(value || "").split("\n"))
  .map(clean).filter(Boolean).slice(0, 30);

const publicJobQuery = () => ({
  status: "published",
  $or: [{ applicationDeadline: null }, { applicationDeadline: { $gte: new Date() } }],
});

export const listPublicJobs = async ({ department = "", location = "" } = {}) => {
  const query = publicJobQuery();
  if (clean(department)) query.department = clean(department);
  if (clean(location)) query.location = clean(location);
  return jobVacancyModel.find(query).sort({ createdAt: -1 }).lean();
};

export const getJobFilters = async () => {
  const query = publicJobQuery();
  const [departments, locations] = await Promise.all([
    jobVacancyModel.distinct("department", query),
    jobVacancyModel.distinct("location", query),
  ]);
  return { departments: departments.sort(), locations: locations.sort() };
};

export const getPublicJob = async (idOrSlug) => {
  const identity = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: clean(idOrSlug).toLowerCase() };
  const job = await jobVacancyModel.findOne({ ...identity, ...publicJobQuery() }).lean();
  if (!job) throw new Error("Job vacancy not found");
  return job;
};

const validateJob = (input = {}) => {
  const payload = {
    title: clean(input.title),
    department: clean(input.department),
    location: clean(input.location),
    employmentType: clean(input.employmentType) || "Full time",
    workplaceType: clean(input.workplaceType) || "On-site",
    experience: clean(input.experience),
    qualification: clean(input.qualification),
    summary: clean(input.summary),
    description: clean(input.description),
    responsibilities: asList(input.responsibilities),
    requirements: asList(input.requirements),
    status: clean(input.status) || "draft",
    applicationDeadline: input.applicationDeadline || null,
  };
  for (const field of ["title", "department", "location", "summary", "description"]) {
    if (!payload[field]) throw new Error(`${field} is required`);
  }
  payload.slug = `${slugify(payload.title)}-${slugify(payload.location)}`;
  return payload;
};

export const createJob = async (input, userId) => {
  const payload = validateJob(input);
  const duplicate = await jobVacancyModel.exists({ slug: payload.slug });
  if (duplicate) payload.slug = `${payload.slug}-${Date.now().toString(36)}`;
  return jobVacancyModel.create({ ...payload, createdBy: userId || null });
};

export const updateJob = async (id, input, userId) => {
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid job ID");
  const payload = validateJob(input);
  const job = await jobVacancyModel.findByIdAndUpdate(id, { ...payload, updatedBy: userId || null }, { new: true, runValidators: true });
  if (!job) throw new Error("Job vacancy not found");
  return job;
};

export const deleteJob = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid job ID");
  const job = await jobVacancyModel.findByIdAndDelete(id);
  if (!job) throw new Error("Job vacancy not found");
  return job;
};

export const listAdminJobs = async ({ search = "", status = "" } = {}) => {
  const query = {};
  if (clean(status) && status !== "all") query.status = clean(status);
  if (clean(search)) query.$or = [
    { title: { $regex: clean(search), $options: "i" } },
    { department: { $regex: clean(search), $options: "i" } },
    { location: { $regex: clean(search), $options: "i" } },
  ];
  return jobVacancyModel.find(query).sort({ createdAt: -1 }).lean();
};

const parseResume = (resumeData, fileName) => {
  const match = String(resumeData || "").match(/^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,(.+)$/);
  if (!match) throw new Error("Resume must be a PDF, DOC or DOCX file");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Resume must be 5 MB or smaller");
  const extension = clean(fileName).split(".").pop().toLowerCase();
  if (!["pdf", "doc", "docx"].includes(extension)) throw new Error("Invalid resume file extension");
  return { bytes, mimeType: match[1], extension };
};

export const submitApplication = async (jobId, input = {}) => {
  if (!mongoose.isValidObjectId(jobId)) throw new Error("Invalid job ID");
  const job = await jobVacancyModel.findOne({ _id: jobId, ...publicJobQuery() });
  if (!job) throw new Error("This vacancy is not accepting applications");
  const required = ["fullName", "email", "phone", "qualification", "experience", "currentLocation"];
  for (const field of required) if (!clean(input[field])) throw new Error(`${field} is required`);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(input.email))) throw new Error("Enter a valid email address");
  const resume = parseResume(input.resumeData, input.resumeFileName);
  // Uploads below need an owning entity id, but the document doesn't exist yet.
  // Mint it first — never upload-then-mint. The registry scopes resumeKey by the
  // application's own id (entity "job-applications"), not the job's — a job can have
  // many applications, so job-scoping wouldn't identify one.
  const applicationId = new mongoose.Types.ObjectId();
  const upload = await uploadImageToS3(
    resume.bytes,
    s3Keys.jobApplication.resume(applicationId),
    { skipImageConversion: true, contentType: resume.mimeType, extension: resume.extension },
  );
  return jobApplicationModel.create({
    _id: applicationId,
    job: jobId,
    fullName: clean(input.fullName),
    email: clean(input.email),
    phone: clean(input.phone),
    qualification: clean(input.qualification),
    experience: clean(input.experience),
    currentLocation: clean(input.currentLocation),
    socialUrl: clean(input.socialUrl),
    coverNote: clean(input.coverNote),
    resumeKey: upload.key,
    resumeFileName: clean(input.resumeFileName),
  });
};

const withResumeUrl = (application) => ({
  ...application,
  resumeUrl: application.resumeKey ? getSignedUrlByKey(application.resumeKey, { signed: true, expiry: 900 }) : "",
});

export const listApplications = async ({ jobId = "", status = "" } = {}) => {
  const query = {};
  if (jobId) query.job = jobId;
  if (status && status !== "all") query.status = status;
  const rows = await jobApplicationModel.find(query).populate("job", "title department location").sort({ createdAt: -1 }).lean();
  return rows.map(withResumeUrl);
};

export const updateApplication = async (id, input = {}) => {
  if (!mongoose.isValidObjectId(id)) throw new Error("Invalid application ID");
  const updates = {};
  if (input.status) updates.status = clean(input.status);
  if (input.adminNotes !== undefined) updates.adminNotes = clean(input.adminNotes);
  const row = await jobApplicationModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
    .populate("job", "title department location").lean();
  if (!row) throw new Error("Application not found");
  return withResumeUrl(row);
};
