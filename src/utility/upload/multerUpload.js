// src/utility/upload/multerupload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export function localUploaderFields(folder = "uploads", fields = []) {
  const uploadPath = path.join(process.cwd(), "public", folder);
  ensureDir(uploadPath);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${file.fieldname}-${Date.now()}${ext}`;

      // ✅ SAVE ONLY RELATIVE PATH
      file.filePath = `${folder}/${name}`.replace(/\\/g, "/");

      cb(null, name);
    }
  });

  return multer({ storage }).fields(fields);
}
