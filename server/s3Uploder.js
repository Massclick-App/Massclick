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


export const uploadImageToS3 = async (fileData, uploadPath) => {
  let fileBuffer;
  let mimeType;
  let extension;

  if (typeof fileData === "string" && fileData.startsWith("data:")) {
    const matches = fileData.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!matches) throw new Error("Invalid base64 string");

    mimeType = matches[1];
    fileBuffer = Buffer.from(matches[2], "base64");
    extension = mimeType.split("/")[1];
  }

  else if (Buffer.isBuffer(fileData)) {
    fileBuffer = fileData;
    mimeType = "application/octet-stream";
    extension = "bin";
  }

  else {
    throw new Error("Invalid file format. Must be Base64 or Buffer.");
  }


  let finalBuffer = fileBuffer;


  if (mimeType.startsWith("image/")) {
    try {
      finalBuffer = await sharp(fileBuffer)
        .jpeg({ quality: 70 })   
        .toBuffer();

      mimeType = "image/jpeg";
      extension = "jpg";
    } catch (err) {
      console.error("Compression failed → uploading original", err);
    }
  }


  const s3Key = `${uploadPath}.${extension}`;

  await s3.upload({
    Bucket: assetsBucket,
    Key: s3Key,
    Body: finalBuffer,
    ContentType: mimeType,
  }).promise();

  return { key: s3Key };
};


export const getSignedUrlByKey = (key, bucketName, expiryTime = 3600) => {
  if (!key) return "";

  return s3.getSignedUrl("getObject", {
    Bucket: bucketName ?? assetsBucket,
    Key: key,
    Expires: expiryTime,
  });
};

// import dotenv from "dotenv";
// dotenv.config();

// import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import sharp from "sharp";

// const assetsBucket = process.env.AWS_S3_BUCKET_MASSCLICK;
// if (!assetsBucket) throw new Error("AWS S3 bucket not configured in env");

// // Initialize S3 client with v3
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// export const uploadImageToS3 = async (fileData, uploadPath) => {
//   let fileBuffer;
//   let mimeType;
//   let extension;

//   try {
//     if (typeof fileData === "string" && fileData.startsWith("data:")) {
//       const matches = fileData.match(/^data:([\w/+.-]+);base64,(.+)$/);
//       if (!matches) throw new Error("Invalid base64 string");

//       mimeType = matches[1];
//       fileBuffer = Buffer.from(matches[2], "base64");
//       extension = mimeType.split("/")[1];
//     } 
//     else if (Buffer.isBuffer(fileData)) {
//       fileBuffer = fileData;
//       mimeType = "application/octet-stream";
//       extension = "bin";
//     } 
//     else {
//       throw new Error("Invalid file format. Must be Base64 or Buffer.");
//     }

//     let finalBuffer = fileBuffer;

//     // Compress images
//     if (mimeType.startsWith("image/")) {
//       try {
//         finalBuffer = await sharp(fileBuffer)
//           .jpeg({ quality: 70 })
//           .toBuffer();
//         mimeType = "image/jpeg";
//         extension = "jpg";
//       } catch (err) {
//         console.error("Compression failed → uploading original", err);
//       }
//     }

//     const s3Key = `${uploadPath}.${extension}`;

//     // Upload using v3
//     const command = new PutObjectCommand({
//       Bucket: assetsBucket,
//       Key: s3Key,
//       Body: finalBuffer,
//       ContentType: mimeType,
//     });

//     await s3Client.send(command);

//     return { key: s3Key, success: true };
//   } catch (error) {
//     console.error("Upload failed:", error);
//     throw new Error(`S3 upload failed: ${error.message}`);
//   }
// };

// export const getSignedUrlByKey = async (key, bucketName, expiryTime = 3600) => {
//   if (!key) return "";

//   try {
//     const command = new GetObjectCommand({
//       Bucket: bucketName ?? assetsBucket,
//       Key: key,
//     });

//     const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiryTime });
//     return signedUrl;
//   } catch (error) {
//     console.error("Failed to generate signed URL:", error);
    
//     // Return a fallback or rethrow based on your needs
//     if (error.name === "Forbidden" || error.name === "AccessDenied") {
//       console.error("IAM user lacks s3:GetObject permission for this key");
//       return null; // Or throw a custom error
//     }
//     throw new Error(`Signed URL generation failed: ${error.message}`);
//   }
// };

// // Optional: Function to check if user has permissions
// export const checkS3Permissions = async () => {
//   try {
//     const testKey = `permission-test-${Date.now()}.txt`;
//     const testBuffer = Buffer.from("Permission test");
    
//     const uploadCommand = new PutObjectCommand({
//       Bucket: assetsBucket,
//       Key: testKey,
//       Body: testBuffer,
//     });
    
//     await s3Client.send(uploadCommand);
    
//     // Clean up
//     const deleteCommand = new DeleteObjectCommand({
//       Bucket: assetsBucket,
//       Key: testKey,
//     });
//     await s3Client.send(deleteCommand);
    
//     return { hasUpload: true, hasRead: true };
//   } catch (error) {
//     return { 
//       hasUpload: error.name !== "AccessDenied",
//       hasRead: false,
//       error: error.message 
//     };
//   }
// };