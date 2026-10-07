import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath, pathToFileURL } from "url";
import cookieParser from "cookie-parser";
import "./server.js";
import { startMarketEngine } from "./src/sockets/market-engine.js";

const app = express();

/* =======================
   MIDDLEWARES
======================= */
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =======================
   CORS CONFIG (NODE 20 SAFE)
======================= */
const allowedOrigins = [
  "https://onetradefx.com",
  "https://www.onetradefx.com",
  "https://admin.onetradefx.com",
  "https://onetradefx.com:9000",
  "http://localhost:3000",
  "http://localhost:4200",
  "http://localhost:8080",
  "http://192.168.1.4:8080"
];

const corsOptions = {
  origin: (origin, callback) => {
    // allow Postman / curl / server-side calls
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // silently block
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Bypass-Cache"
  ]
};

// ✅ THIS IS ENOUGH (NO app.options NEEDED)
app.use(cors(corsOptions));

/* =======================
   START SOCKET ENGINE (OPTIONAL)
======================= */
// startMarketEngine();

/* =======================
   VIEW ENGINE
======================= */
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));

/* =======================
   STATIC FILES
======================= */
app.use(express.static(path.join(process.cwd(), "public")));

/* =======================
   ES MODULE FIX
======================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =======================
   AUTO ROUTE LOADER
======================= */
const MODULES_DIR = path.join(__dirname, "src/modules");
let ROUTE_COUNT = 0;

console.log("====================================");
console.log("    AUTO ROUTE LOADER STARTED");
console.log("====================================");

async function loadRoutes(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await loadRoutes(fullPath);
      continue;
    }

    if (item === "routes.js") {
      try {
        const fileUrl = pathToFileURL(fullPath).href;
        const moduleRoute = await import(fileUrl);

        // Build route path from folder structure
        const routePath = fullPath
          .replace(MODULES_DIR, "")
          .replace(/\\/g, "/")
          .replace("/routes.js", "");

        // Admin HTML → /admin
        // APIs → /api/*
        const finalPath = routePath.startsWith("/admin")
          ? routePath
          : `/api${routePath}`;

        app.use(finalPath, moduleRoute.default);

        ROUTE_COUNT++;
        console.log(`✔ Mounted: ${finalPath}`);
      } catch (err) {
        console.log(`❌ Error loading: ${fullPath}`);
        console.error(err);
      }
    }
  }
}

// Load all routes
await loadRoutes(MODULES_DIR);

console.log("====================================");
console.log(` TOTAL ROUTES LOADED: ${ROUTE_COUNT}`);
console.log("====================================");

/* =======================
   FALLBACK (OPTIONAL)
======================= */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
