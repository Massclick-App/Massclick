import { ObjectId } from "mongodb";
import massclickDocumentsModel from "../../model/massclickDocuments/massclickDocumentsModel.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../../s3Uploder.js";

const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;

const escapeRegExp = (value = "") =>
  value.toString().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeDocument = (document) => {
  if (!document) return document;

  return {
    ...document,
    documentUrl: document.documentKey ? getSignedUrlByKey(document.documentKey) : "",
    mediaItems: (document.mediaItems || []).map((item) => ({
      ...item,
      mediaUrl: item.mediaKey ? getSignedUrlByKey(item.mediaKey) : "",
    })),
  };
};

const getBase64Size = (dataUrl = "") => {
  const base64 = dataUrl.split(",")[1] || "";
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const getExtensionFromFileName = (fileName = "") => {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toLowerCase() : "";
};

const isAllowedDocument = (fileType = "", fileName = "") => {
  if (ALLOWED_DOCUMENT_TYPES.has(fileType)) return true;

  const extension = getExtensionFromFileName(fileName);
  return ALLOWED_DOCUMENT_EXTENSIONS.has(extension);
};

const toStringArray = (value) => {
  if (Array.isArray(value)) return value.map((item) => `${item}`.trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const validateDocumentPayload = (data = {}, requireFile = true) => {
  if (!data.title?.trim()) throw new Error("Title is required");
  if (!data.section?.trim()) throw new Error("Section is required");

  const hasResourceContent = Boolean(
    data.documentFile ||
    data.summary?.trim() ||
    data.contentDetails?.trim() ||
    toStringArray(data.youtubeLinks).length ||
    toStringArray(data.videoLinks).length ||
    toStringArray(data.imageLinks).length ||
    toStringArray(data.keyBenefits).length ||
    toStringArray(data.useCases).length ||
    data.mediaFiles?.length
  );

  if (requireFile && !hasResourceContent) {
    throw new Error("Add a document, media, link, or awareness content");
  }

  if (!data.documentFile) return;

  if (!data.fileName?.trim()) throw new Error("File name is required");
  if (!isAllowedDocument(data.fileType, data.fileName)) {
    throw new Error("Unsupported document type");
  }
  if (getBase64Size(data.documentFile) > MAX_DOCUMENT_SIZE) {
    throw new Error("Document must be 15 MB or smaller");
  }
};

const uploadDocument = async (data = {}) => {
  const extension = getExtensionFromFileName(data.fileName);
  const uploadResult = await uploadImageToS3(
    data.documentFile,
    `massclick-documents/${data.section.trim().toLowerCase().replace(/\s+/g, "-")}/document-${Date.now()}`,
    {
      skipImageConversion: true,
      contentType: data.fileType,
      extension,
    }
  );

  return uploadResult.key;
};

const uploadMediaFiles = async (data = {}) => {
  const files = Array.isArray(data.mediaFiles) ? data.mediaFiles : [];

  return Promise.all(
    files
      .filter((file) => file?.mediaFile && file?.fileName)
      .map(async (file) => {
        const extension = getExtensionFromFileName(file.fileName);
        const isImage = (file.fileType || "").startsWith("image/");
        const isVideo = (file.fileType || "").startsWith("video/");
        const uploadResult = await uploadImageToS3(
          file.mediaFile,
          `massclick-documents/${data.section.trim().toLowerCase().replace(/\s+/g, "-")}/media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          {
            skipImageConversion: true,
            contentType: file.fileType,
            extension,
          }
        );

        return {
          title: file.title || file.fileName,
          mediaType: isImage ? "image" : isVideo ? "video" : "file",
          mediaKey: uploadResult.key,
          fileName: file.fileName,
          fileType: file.fileType || "application/octet-stream",
          fileSize: file.fileSize || getBase64Size(file.mediaFile),
        };
      })
  );
};

const buildResourceFields = (data = {}) => ({
  resourceType: data.resourceType || "document",
  summary: data.summary || "",
  contentDetails: data.contentDetails || "",
  youtubeLinks: toStringArray(data.youtubeLinks),
  videoLinks: toStringArray(data.videoLinks),
  imageLinks: toStringArray(data.imageLinks),
  keyBenefits: toStringArray(data.keyBenefits),
  useCases: toStringArray(data.useCases),
  targetAudience: data.targetAudience || "",
  displayOrder: Number(data.displayOrder || 0),
});

export const createMassclickDocument = async (data = {}, user = {}) => {
  validateDocumentPayload(data, true);

  const documentKey = data.documentFile ? await uploadDocument(data) : "";
  const mediaItems = await uploadMediaFiles(data);
  const document = new massclickDocumentsModel({
    title: data.title,
    section: data.section,
    description: data.description || "",
    ...buildResourceFields(data),
    documentKey,
    fileName: data.fileName || "",
    fileType: data.fileType || "",
    fileSize: data.fileSize || getBase64Size(data.documentFile),
    mediaItems,
    isActive: data.isActive ?? true,
    createdBy: user?._id || user?.id || null,
  });

  const result = await document.save();
  return {
    message: "Document uploaded successfully",
    document: normalizeDocument(result.toObject()),
  };
};

export const viewMassclickDocument = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid document ID");

  const document = await massclickDocumentsModel
    .findOne({ _id: id, isDeleted: false })
    .lean();

  if (!document) throw new Error("Document not found");
  return normalizeDocument(document);
};

export const viewAllMassclickDocuments = async ({
  pageNo = 1,
  pageSize = 10,
  search = "",
  status = "all",
  section = "",
  sortBy = "createdAt",
  sortOrder = -1,
}) => {
  const query = { isDeleted: false };

  if (status === "active") query.isActive = true;
  if (status === "inactive") query.isActive = false;
  if (section) query.section = { $regex: `^${escapeRegExp(section)}$`, $options: "i" };
  if (search) {
    const safeSearch = escapeRegExp(search);
    query.$or = [
      { title: { $regex: safeSearch, $options: "i" } },
      { section: { $regex: safeSearch, $options: "i" } },
      { fileName: { $regex: safeSearch, $options: "i" } },
      { summary: { $regex: safeSearch, $options: "i" } },
      { contentDetails: { $regex: safeSearch, $options: "i" } },
    ];
  }

  const total = await massclickDocumentsModel.countDocuments(query);
  const documents = await massclickDocumentsModel
    .find(query)
    .sort({ [sortBy || "createdAt"]: sortOrder })
    .skip((pageNo - 1) * pageSize)
    .limit(pageSize)
    .lean();

  return {
    list: documents.map(normalizeDocument),
    total,
  };
};

export const updateMassclickDocument = async (id, data = {}) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid document ID");

  const existingDocument = await massclickDocumentsModel.findById(id).lean();
  if (!existingDocument || existingDocument.isDeleted) {
    throw new Error("Document not found");
  }

  validateDocumentPayload(data, false);

  const updateData = {
    title: data.title,
    section: data.section,
    description: data.description || "",
    ...buildResourceFields(data),
    isActive: data.isActive ?? true,
    updatedAt: new Date(),
  };

  if (data.documentFile) {
    updateData.documentKey = await uploadDocument(data);
    updateData.fileName = data.fileName;
    updateData.fileType = data.fileType;
    updateData.fileSize = data.fileSize || getBase64Size(data.documentFile);
  }

  const newMediaItems = await uploadMediaFiles(data);
  updateData.mediaItems = [
    ...(Array.isArray(data.existingMediaItems) ? data.existingMediaItems : existingDocument.mediaItems || []),
    ...newMediaItems,
  ];

  const updatedDocument = await massclickDocumentsModel
    .findByIdAndUpdate(id, updateData, { new: true })
    .lean();

  return normalizeDocument(updatedDocument);
};

export const deleteMassclickDocument = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid document ID");

  const deletedDocument = await massclickDocumentsModel
    .findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false, updatedAt: new Date() },
      { new: true }
    )
    .lean();

  if (!deletedDocument) throw new Error("Document not found");
  return deletedDocument;
};
