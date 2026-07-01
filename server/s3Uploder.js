import dotenv from "dotenv";
dotenv.config();

import AWS from "aws-sdk";
import sharp from "sharp";  

const assetsBucket = process.env.AWS_S3_BUCKET_MASSCLICK;
if (!assetsBucket) throw new Error("AWS S3 bucket not configured in env");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

export const uploadImageToS3 = async (fileData, uploadPath, options = {}) => {
  const { skipImageConversion = false, contentType: forcedContentType = "", extension: forcedExtension = "" } = options;
  let fileBuffer;
  let mimeType;
  let extension;

  if (typeof fileData === "string" && fileData.startsWith("data:")) {
    const matches = fileData.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid base64 string");

    mimeType = forcedContentType || matches[1];
    fileBuffer = Buffer.from(matches[2], "base64");
    extension = forcedExtension || mimeType.split("/")[1];
  }

  else if (Buffer.isBuffer(fileData)) {
    fileBuffer = fileData;
    mimeType = forcedContentType || "application/octet-stream";
    extension = forcedExtension || "bin";
  }

  else {
    throw new Error("Invalid file format. Must be Base64 or Buffer.");
  }

  let finalBuffer = fileBuffer;


  if (mimeType.startsWith("image/") && !skipImageConversion) {
    try {
      finalBuffer = await sharp(fileBuffer)
        .webp({ quality: 70 })
        .toBuffer();

      mimeType = "image/webp";
      extension = "webp";
    } catch (err) {
      console.error("WebP conversion failed → uploading original", err);
    }
  }

  const s3Key = `${uploadPath}.${extension}`;

  await s3.upload({
    Bucket: assetsBucket,
    Key: s3Key,
    Body: finalBuffer,
    ContentType: mimeType,
    CacheControl: 'public, max-age=31536000',
  }).promise();

  return { key: s3Key };
};


// export const getSignedUrlByKey = (key, bucketName, expiryTime = 3600) => {
//   if (!key) return "";

//   return s3.getSignedUrl("getObject", {
//     Bucket: bucketName ?? assetsBucket,
//     Key: key,
//     Expires: expiryTime,
//   });
// };
export const getSignedUrlByKey = (key, { signed = false, expiry = 3600 } = {}) => {
  if (!key) return "";

  if (signed) {
    return s3.getSignedUrl("getObject", {
      Bucket: assetsBucket,
      Key: key,
      Expires: expiry,
    });
  }

  return `https://${assetsBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const getImageDataUrlByKey = async (key) => {
  if (!key) return "";

  try {
    const object = await s3.getObject({
      Bucket: assetsBucket,
      Key: key,
    }).promise();

    const buffer = Buffer.isBuffer(object.Body)
      ? object.Body
      : Buffer.from(object.Body || []);
    const contentType = object.ContentType || "image/webp";

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.warn("Unable to read image data URL from S3:", error.message);
    return "";
  }
};
