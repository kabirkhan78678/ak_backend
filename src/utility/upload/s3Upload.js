// src/utils/upload/s3Upload.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

// Memory storage for buffering file before sending to S3
export const s3Multer = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_KEY,
    secretAccessKey: process.env.S3_SECRET
  }
});

/**
 * Upload any file to S3 and return standardized output
 */
export const uploadToS3 = async (file, folder = "uploads") => {
  const ext = path.extname(file.originalname);
  const base = path.basename(file.originalname, ext).replace(/\s+/g, "_");
  const fileName = `${base}-${Date.now()}${ext}`;
  const key = `${folder}/${fileName}`;

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  await s3.send(new PutObjectCommand(params));

  const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

  return {
    fileName,
    filePath: key,
    fileUrl
  };
};
