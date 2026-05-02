import { createServer } from "http";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { initWsServer } from "./websocket/wsServer.js";
import compression from "compression";
import helmet from "helmet";

import { metricsMiddleware } from "./utils/metricsMiddleware.js";
import wellKnownRoutes from "./routes/wellKnownRoutes.js";
import { ssrMiddleware } from "./middleware/ssrMiddleware.js";

import userRoutes from "./routes/userRoutes.js";
import userClientRoutes from "./routes/userClientRoute.js";
import locationRoutes from "./routes/locationRoute.js";
import fcmTokenRoutes from "./routes/fcmTokenRoutes.js";
import oauthRoutes from "./routes/oauthRoutes.js";
import categoryRoutes from "./routes/categoryRoute.js";
import businessListRoutes from "./routes/businessListRoute.js";
import rolesRoutes from "./routes/rolesRoutes.js";
import enquiryRoutes from "./routes/enquiryRoute.js";
import startYourProjectRoutes from "./routes/startYourProjectRoutes.js";
import otpRoutes from "./routes/msg91Routes.js";
import phonePayRoutes from "./routes/phonePayRoute.js";
import advertismentRoutes from "./routes/advertistmentRoute.js";
import leadsDataRoutes from "./routes/leadsDataRoutes.js";
import seoRoutes from "./routes/seoRoutes.js";
import mrpRoutes from "./routes/mrpRoutes.js";
import popularSearchRoutes from "./routes/popularSearchRoutes.js";
import sitemapRoutes from "./routes/sitemapRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import advertiseRoute from "./routes/advertiseRoute.js";
import versionRoutes from "./routes/versionRoutes.js";
import favoriteRoute from "./routes/favoriteRoute.js";
import fcmAdminRoutes from "./routes/fcmAdminRoutes.js";
import systemSettingsRoutes from "./routes/systemSettingsRoutes.js";
import footerRoutes from "./routes/footerRoute.js";
import { startFCMScheduler } from "./scheduler/fcmScheduler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.set("trust proxy", true);

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URL;
const CLIENT_BUILD_PATH = process.env.REACT_BUILD_PATH;

app.use((req, res, next) => {
  const host = req.headers.host || "";
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;

  if (!host.includes("localhost") && !host.includes("127.0.0.1")) {
    if (protocol !== "https") {
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    if (host === "www.massclick.in") {
      return res.redirect(301, `https://massclick.in${req.originalUrl}`);
    }
  }
  next();
});

app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(compression());

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(metricsMiddleware);

app.use(wellKnownRoutes);

app.use("/", sitemapRoutes);
app.use("/", userRoutes);
app.use("/", fcmTokenRoutes);
app.use("/", oauthRoutes);
app.use("/", userClientRoutes);
app.use("/", locationRoutes);
app.use("/", categoryRoutes);
app.use("/", businessListRoutes);
app.use("/", rolesRoutes);
app.use("/", enquiryRoutes);
app.use("/", startYourProjectRoutes);
app.use("/", otpRoutes);
app.use("/", phonePayRoutes);
app.use("/", advertismentRoutes);
app.use("/", leadsDataRoutes);
app.use("/", seoRoutes);
app.use("/", mrpRoutes);
app.use("/", popularSearchRoutes);
app.use("/", reviewRoutes);
app.use("/", advertiseRoute);
app.use("/", versionRoutes);
app.use("/", footerRoutes);
app.use("/", favoriteRoute);
app.use("/", fcmAdminRoutes);
app.use("/", systemSettingsRoutes);

app.use(express.static(CLIENT_BUILD_PATH, {
  index: false,
  maxAge: "365d",
  etag: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    } else {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

app.get(/.*/, ssrMiddleware);

mongoose.connect(MONGO_URI)
  .then(async () => {
    startFCMScheduler();
    await initWsServer(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error(err));
