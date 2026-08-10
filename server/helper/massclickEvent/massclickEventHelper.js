import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import massclickEventModel from "../../model/massclickEvent/massclickEventModel.js";
import { getSignedUrlByKey, uploadImageToS3 } from "../../s3Uploder.js";

const serialize = (item) => {
  const event = typeof item?.toObject === "function" ? item.toObject() : item;
  if (!event) return event;
  const normalizeMedia = (media) => media ? {
    ...media,
    mediaUrl: getSignedUrlByKey(media.mediaKey),
    thumbnailUrl: media.thumbnailKey ? getSignedUrlByKey(media.thumbnailKey) : "",
  } : null;
  const mediaItems = (event.mediaItems?.length ? event.mediaItems : [event.media])
    .filter(Boolean)
    .map(normalizeMedia);
  return {
    ...event,
    media: normalizeMedia(event.media),
    mediaItems,
  };
};

export const uploadMassclickEventMedia = async ({ fileData, fileBuffer, mediaType, contentType, thumbnailData }) => {
  const limits = { image: 10 * 1024 * 1024, video: 40 * 1024 * 1024 };
  if (!limits[mediaType]) throw new Error("Media type must be image or video");
  const isBinary = Buffer.isBuffer(fileBuffer);
  const match = !isBinary && typeof fileData === "string" && fileData.match(/^data:([\w/+.-]+);base64,(.+)$/);
  const mimeType = isBinary ? contentType : match?.[1];
  if (!mimeType?.startsWith(`${mediaType}/`)) throw new Error(`A valid ${mediaType} file is required`);
  const fileSize = isBinary ? fileBuffer.length : Buffer.byteLength(match[2], "base64");
  if (!fileSize) throw new Error("The selected file is empty");
  if (fileSize > limits[mediaType]) throw new Error(`${mediaType} file is too large`);

  const uploaded = await uploadImageToS3(
    isBinary ? fileBuffer : fileData,
    `massclick-events/${mediaType}s/${Date.now()}-${randomUUID()}`,
    {
      skipImageConversion: mediaType === "video",
      ...(isBinary ? { contentType: mimeType, extension: mimeType.split("/")[1] } : {}),
    },
  );
  let thumbnailKey = "";
  if (thumbnailData?.startsWith("data:image/")) {
    const thumbnail = await uploadImageToS3(thumbnailData, `massclick-events/thumbnails/${Date.now()}-${randomUUID()}`);
    thumbnailKey = thumbnail.key;
  }
  return serialize({ media: { mediaType, mediaKey: uploaded.key, thumbnailKey } }).media;
};

export const listMassclickEvents = async ({
  publishedOnly = false,
  pageNo = 1,
  pageSize = 20,
  search = "",
  status = "all",
  sortBy = "",
  sortOrder = "asc",
} = {}) => {
  const query = publishedOnly ? { isPublished: true } : {};
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }
  if (!publishedOnly && status === "published") query.isPublished = true;
  if (!publishedOnly && status === "draft") query.isPublished = false;
  const safeLimit = Math.min(Math.max(Number(pageSize) || 20, 1), 60);
  const skip = (Math.max(Number(pageNo) || 1, 1) - 1) * safeLimit;
  const sort = sortBy
    ? { [sortBy]: sortOrder === "desc" ? -1 : 1 }
    : { featured: -1, sortOrder: 1, eventDate: -1 };
  const [items, total] = await Promise.all([
    massclickEventModel.find(query).sort(sort).skip(skip).limit(safeLimit).lean(),
    massclickEventModel.countDocuments(query),
  ]);
  return { data: items.map(serialize), total, pageNo: Number(pageNo) || 1, pageSize: safeLimit };
};

export const saveMassclickEvent = async (id, data) => {
  const mediaItems = Array.isArray(data.mediaItems)
    ? data.mediaItems
        .filter((item) => item?.mediaKey)
        .map(({ mediaType, mediaKey, thumbnailKey = "" }) => ({ mediaType, mediaKey, thumbnailKey }))
    : [];
  if (mediaItems.length > 50) throw new Error("A MassClick event can contain at most 50 media files");
  const primaryMedia = data.media?.mediaKey
    ? { mediaType: data.media.mediaType, mediaKey: data.media.mediaKey, thumbnailKey: data.media.thumbnailKey || "" }
    : mediaItems[0];
  const payload = {
    title: data.title,
    description: data.description || "",
    fullDescription: data.fullDescription || "",
    venue: data.venue || "",
    eventDate: data.eventDate,
    featured: Boolean(data.featured),
    isPublished: Boolean(data.isPublished),
    sortOrder: Number(data.sortOrder) || 0,
    ...(primaryMedia ? { media: primaryMedia } : {}),
    ...(mediaItems.length ? { mediaItems } : {}),
  };
  const event = id
    ? await massclickEventModel.findByIdAndUpdate(id, { ...payload, updatedBy: data.userId }, { new: true, runValidators: true })
    : await massclickEventModel.create({ ...payload, createdBy: data.userId });
  if (!event) throw new Error("MassClick event not found");
  return serialize(event);
};

export const viewMassclickEvent = async (eventId) => {
  if (!ObjectId.isValid(eventId)) throw new Error("Invalid MassClick event ID");
  const event = await massclickEventModel.findOne({ _id: eventId, isPublished: true }).lean();
  if (!event) throw new Error("MassClick event not found");
  return serialize(event);
};

export const removeMassclickEvent = async (id) => {
  if (!ObjectId.isValid(id)) throw new Error("Invalid MassClick event ID");
  const event = await massclickEventModel.findByIdAndDelete(id);
  if (!event) throw new Error("MassClick event not found");
  return serialize(event);
};
