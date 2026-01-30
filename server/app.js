import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import prerender from "prerender-node";
import userRoutes from './routes/userRoutes.js';
import userClientRoutes from './routes/userClientRoute.js'
import locationRoutes from './routes/locationRoute.js'
import oauthRoutes from "./routes/oauthRoutes.js";
import categoryRoutes from "./routes/categoryRoute.js"
import businessListRoutes from "./routes/businessListRoute.js"
import rolesRoutes from "./routes/rolesRoutes.js"
import enquiryRoutes from "./routes/enquiryRoute.js"
import startYourProjectRoutes from "./routes/startYourProjectRoutes.js"
import otpRoutes from "./routes/msg91Routes.js"
import phonePayRoutes from "./routes/phonePayRoute.js"
import advertismentRoutes from "./routes/advertistmentRoute.js"
import leadsDataRoutes from "./routes/leadsDataRoutes.js"
import seoRoutes from './routes/seoRoutes.js'
import mrpRoutes from './routes/mrpRoutes.js';
import popularSearchRoutes from './routes/popularSearchRoutes.js';
import sitemapRoutes from "./routes/sitemapRoutes.js"
import reviewRoutes from "./routes/reviewRoutes.js";

// import { startWhatsAppCron } from "./cron/whatsappCron.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URL
const app = express();

app.use(
  prerender
    .set("prerenderToken", process.env.PRERENDER_TOKEN)
    .set("crawlerUserAgents", [
      "googlebot",
      "bingbot",
      "yandex",
      "duckduckbot",
      "baiduspider",
      "facebookexternalhit",
      "twitterbot",
      "rogerbot",
      "linkedinbot",
      "embedly",
      "quora link preview",
      "showyoubot",
      "outbrain",
      "pinterest",
      "slackbot",
      "vkShare",
      "W3C_Validator"
    ])
);

const allowedOrigins = [
  'https://massclick.in',
  'https://www.massclick.in',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'));
  },
  credentials: true
}));

// app.use((req, res, next) => {
//   if (req.method === 'OPTIONS') {
//     return res.sendStatus(204);
//   }
//   next();
// });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/', userRoutes);
app.use('/', oauthRoutes);
app.use('/', userClientRoutes);
app.use('/', locationRoutes);
app.use('/', categoryRoutes);
app.use('/', businessListRoutes);
app.use('/', rolesRoutes);
app.use('/', enquiryRoutes);
app.use('/', startYourProjectRoutes);
app.use('/', otpRoutes);
app.use('/', phonePayRoutes);
app.use('/', advertismentRoutes);
app.use('/', leadsDataRoutes);
app.use('/', seoRoutes);
app.use('/', mrpRoutes);
app.use('/', popularSearchRoutes);
app.use("/", sitemapRoutes);
app.use('/', reviewRoutes);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Database Connected");

    // startWhatsAppCron();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });